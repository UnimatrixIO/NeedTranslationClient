import http, { IncomingMessage, ServerResponse } from 'http';
import pino from 'pino';
import { config } from './config.js';
import { getPollingEnabled, setPollingEnabled, getResults, getResult } from './client.js';
import { sdk } from './sdk.js';
import type { TranslationRequest } from './client.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export function startServer(): http.Server {
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!req.url) return send(res, 404, { error: 'not found' });

      // Health check
      if (req.method === 'GET' && req.url === '/health') {
        return send(res, 200, { ok: true, pollingEnabled: getPollingEnabled() });
      }

      // Enable polling
      if (req.method === 'POST' && req.url === '/polling/enable') {
        setPollingEnabled(true);
        return send(res, 200, { ok: true, pollingEnabled: true });
      }

      // Disable polling
      if (req.method === 'POST' && req.url === '/polling/disable') {
        setPollingEnabled(false);
        return send(res, 200, { ok: true, pollingEnabled: false });
      }

      // Create translation request
      if (req.method === 'POST' && req.url === '/create-translation') {
        const body = await readBody(req);
        const { responderDid, text, targetLanguage, sourceLanguage, amount } = body;

        if (!responderDid || !text || !targetLanguage) {
          return send(res, 400, { error: 'Missing required fields: responderDid, text, targetLanguage' });
        }

        const payload: TranslationRequest = {
          text,
          targetLanguage,
          sourceLanguage,
        };

        const transaction = await sdk.createTransaction({
          responderDid,
          description: JSON.stringify(payload),
          amount: amount || 100,
        });

        log.info({ txId: transaction.id, responderDid }, 'created translation transaction');
        return send(res, 200, { ok: true, transaction });
      }

      // Get all results
      if (req.method === 'GET' && req.url === '/results') {
        const resultsArray = Array.from(getResults().entries()).map(([txId, result]) => ({
          transactionId: txId,
          ...result,
        }));
        return send(res, 200, { ok: true, results: resultsArray });
      }

      // Get specific result
      if (req.method === 'GET' && req.url.startsWith('/results/')) {
        const txId = req.url.split('/').pop();
        if (!txId) return send(res, 400, { error: 'Invalid transaction ID' });

        const result = getResult(txId);
        if (!result) return send(res, 404, { error: 'Result not found' });

        return send(res, 200, { ok: true, transactionId: txId, result });
      }

      return send(res, 404, { error: 'not found' });
    } catch (err) {
      log.error({ err }, 'server error');
      return send(res, 500, { error: 'internal error' });
    }
  });

  server.listen(config.port, () => {
    log.info({ port: config.port }, 'control plane listening');
  });

  return server;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('content-length', Buffer.byteLength(json).toString());
  res.end(json);
}

async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

