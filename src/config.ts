import 'dotenv/config';

export const config = {
  agirailsBaseUrl: process.env.AGIRAILS_BASE_URL ?? 'http://localhost:5173',
  agentApiKey: process.env.AGENT_API_KEY ?? '',
  agentDid: process.env.AGENT_DID ?? '',
  pollingEnabled: (process.env.POLLING_ENABLED ?? 'true').toLowerCase() === 'true',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? '3000'),
  port: Number(process.env.PORT ?? '8788'),
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.agentApiKey) missing.push('AGENT_API_KEY');
  if (!config.agentDid) missing.push('AGENT_DID');
  if (!config.agirailsBaseUrl) missing.push('AGIRAILS_BASE_URL');
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

