import { fetch as expoFetch } from 'expo/fetch';

/**
 * One frame of the Mastra agent stream:
 * `data: { type, runId, from, payload }\n\n`.
 */
export interface MastraChunk {
  type: string;
  runId?: string;
  from?: string;
  payload?: Record<string, unknown>;
}

export interface StreamAgentParams {
  baseUrl: string;
  agentId: string;
  /** The new user message only — the backend loads thread history itself. */
  message: string;
  threadId: string;
  resourceId: string;
  requestContext?: Record<string, unknown>;
  signal: AbortSignal;
  onChunk: (chunk: MastraChunk) => void;
}

/**
 * Streams one agent turn from the wallet-agent backend (Mastra chunk SSE).
 *
 * Uses expo/fetch deliberately: the global fetch (nitro-fetch) buffers the
 * whole body before resolving, so `getReader()` on it does not stream
 * incrementally. Same technique as bridge quotes — see
 * app/core/Engine/controllers/bridge-controller/bridge-controller-init.ts.
 */
export async function streamAgentChunks({
  baseUrl,
  agentId,
  message,
  threadId,
  resourceId,
  requestContext,
  signal,
  onChunk,
}: StreamAgentParams): Promise<void> {
  const response = await expoFetch(`${baseUrl}/api/agents/${agentId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      memory: { thread: threadId, resource: resourceId },
      ...(requestContext ? { requestContext } : {}),
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Chat backend error: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/u);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        for (const line of frame.split(/\r?\n/u)) {
          // ':'-prefixed lines are SSE comments (connect/keep-alive) — skip.
          if (line.startsWith(':') || !line.startsWith('data:')) continue;
          const data = line.slice('data:'.length).trim();
          if (!data || data === '[DONE]') continue;
          try {
            onChunk(JSON.parse(data) as MastraChunk);
          } catch {
            // Malformed frame — skip rather than kill the stream.
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}
