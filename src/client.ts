import pino from 'pino';
import { sdk, type Transaction } from './sdk.js';
import { config } from './config.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export type TranslationRequest = {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
};

export type TranslationResult = {
  translatedText: string;
  targetLanguage: string;
  sourceLanguage: string;
  confidence: number;
};

const processed = new Set<string>();
const results = new Map<string, TranslationResult>();

function shouldProcess(tx: Transaction): boolean {
  if (tx.initiatorDid !== config.agentDid) return false;
  if (tx.state !== 'COMPLETED') return false;
  if (processed.has(tx.id)) return false;
  return true;
}

async function getResultFromMessages(transactionId: string): Promise<TranslationResult | null> {
  const messages = await sdk.getMessages(transactionId);
  
  // Look for COMPLETE message with workResult
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.messageType === 'COMPLETE') {
      const payload = m.payload as any;
      
      // Check for workResult field (from completeTransaction)
      if (payload?.workResult) {
        const wr = payload.workResult;
        if (wr.translatedText && wr.targetLanguage && wr.sourceLanguage && wr.confidence) {
          return {
            translatedText: wr.translatedText,
            targetLanguage: wr.targetLanguage,
            sourceLanguage: wr.sourceLanguage,
            confidence: wr.confidence,
          };
        }
      }
      
      // Check for translation field (from postMessage COMPLETE)
      if (payload?.translation && payload?.targetLanguage && payload?.sourceLanguage) {
        return {
          translatedText: payload.translation,
          targetLanguage: payload.targetLanguage,
          sourceLanguage: payload.sourceLanguage,
          confidence: 95, // Default confidence if not provided
        };
      }
    }
  }
  
  return null;
}

export async function processOnce(): Promise<void> {
  const all = await sdk.listTransactions();
  const candidates = all.filter(shouldProcess);
  if (candidates.length === 0) return;

  for (const tx of candidates) {
    try {
      log.info({ txId: tx.id, state: tx.state }, 'processing completed transaction');

      const workResult = await getResultFromMessages(tx.id);
      
      if (!workResult) {
        log.warn({ txId: tx.id }, 'no work result found in messages');
        processed.add(tx.id);
        continue;
      }

      log.info(
        {
          txId: tx.id,
          translatedText: workResult.translatedText,
          targetLanguage: workResult.targetLanguage,
          sourceLanguage: workResult.sourceLanguage,
          confidence: workResult.confidence,
        },
        'translation completed'
      );

      results.set(tx.id, workResult);
      processed.add(tx.id);
    } catch (err) {
      log.error({ err, txId: tx.id }, 'processing failed');
    }
  }
}

let interval: NodeJS.Timeout | null = null;

export function startPolling(): void {
  if (interval) return;
  log.info('starting polling');
  interval = setInterval(() => {
    if (!runtimePollingEnabled) return;
    processOnce().catch((err) => log.error({ err }, 'polling tick failed'));
  }, config.pollIntervalMs);
}

export function stopPolling(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    log.info('stopped polling');
  }
}

let runtimePollingEnabled = config.pollingEnabled;
export function setPollingEnabled(enabled: boolean): void {
  runtimePollingEnabled = enabled;
  log.info({ enabled }, 'polling enabled changed');
}

export function getPollingEnabled(): boolean {
  return runtimePollingEnabled;
}

export function getResults(): Map<string, TranslationResult> {
  return results;
}

export function getResult(transactionId: string): TranslationResult | undefined {
  return results.get(transactionId);
}

