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

export async function processOnce(): Promise<void> {
  const all = await sdk.listTransactions();
  const candidates = all.filter(shouldProcess);
  if (candidates.length === 0) return;

  for (const tx of candidates) {
    try {
      log.info({ txId: tx.id, state: tx.state }, 'processing completed transaction');

      if (!tx.workResult) {
        log.warn({ txId: tx.id }, 'no work result found');
        processed.add(tx.id);
        continue;
      }

      const workResult = tx.workResult as TranslationResult;
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

