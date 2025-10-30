import pino from 'pino';
import { validateConfig, config } from './config.js';
import { startPolling, stopPolling } from './client.js';
import { startServer } from './server.js';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

async function main(): Promise<void> {
  validateConfig();

  startServer();
  if (config.pollingEnabled) {
    startPolling();
    log.info('polling enabled');
  } else {
    stopPolling();
    log.info('polling disabled');
  }
}

main().catch((err) => {
  log.error({ err }, 'fatal');
  process.exit(1);
});

