import { request } from 'undici';
import { z } from 'zod';
import { config } from './config.js';

const TransactionsSchema = z.array(
  z.object({
    id: z.string(),
    initiatorDid: z.string(),
    responderDid: z.string().nullable(),
    state: z.string(),
    description: z.string().nullable().optional(),
    amount: z.number().optional(),
    metadata: z.any().optional(),
    workResult: z.any().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
);

const TransactionSchema = z.object({
  id: z.string(),
  initiatorDid: z.string(),
  responderDid: z.string().nullable(),
  state: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number().optional(),
  metadata: z.any().optional(),
  workResult: z.any().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const MessagesSchema = z.array(
  z.object({
    id: z.string(),
    transactionId: z.string(),
    senderDid: z.string(),
    messageType: z.string(),
    payload: z.any().optional(),
    signature: z.string().optional(),
    createdAt: z.string().optional(),
  })
);

export type Transaction = z.infer<typeof TransactionSchema>;
export type Message = z.infer<typeof MessagesSchema>[number];

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function api<T>(method: HttpMethod, path: string, body?: unknown, useAgentAuth = false): Promise<T> {
  const url = `${config.agirailsBaseUrl}${path}`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (useAgentAuth) headers['authorization'] = `Bearer ${config.agentApiKey}`;
  const res = await request(url, {
    method: method as any,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`API ${method} ${path} failed ${res.statusCode}: ${text}`);
  }
  const text = await res.body.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export const sdk = {
  async listTransactions(): Promise<Transaction[]> {
    const data = await api<unknown>('GET', '/api/transactions');
    return TransactionsSchema.parse(data);
  },

  async getTransaction(transactionId: string): Promise<Transaction> {
    const data = await api<unknown>('GET', `/api/transactions/${transactionId}`, undefined, true);
    return TransactionSchema.parse(data);
  },

  async getMessages(transactionId: string): Promise<Message[]> {
    const data = await api<unknown>('GET', `/api/transactions/${transactionId}/messages`, undefined, true);
    return MessagesSchema.parse(data);
  },

  async createTransaction(payload: {
    responderDid: string;
    description: string;
    amount: number;
    metadata?: unknown;
  }): Promise<Transaction> {
    return api<Transaction>(
      'POST',
      '/api/agents/transactions',
      {
        responderDid: payload.responderDid,
        description: payload.description,
        amount: payload.amount,
        metadata: payload.metadata,
      },
      true
    );
  },

  async postMessage(transactionId: string, messageType: string, payload: unknown): Promise<Message> {
    return api<Message>(
      'POST',
      `/api/transactions/${transactionId}/messages`,
      { messageType, payload, signature: `sig-${Date.now()}` },
      true
    );
  },

  async settleTransaction(transactionId: string): Promise<Transaction> {
    return api<Transaction>(
      'PATCH',
      `/api/transactions/${transactionId}/state`,
      { state: 'SETTLED' },
      true
    );
  },
};

