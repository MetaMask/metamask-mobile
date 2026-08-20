/* eslint-disable import-x/no-nodejs-modules */
// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket, type RawData } from 'ws';
import type { IncomingMessage } from 'http';
import type LocalWebSocketServer from './server.ts';
import { createLogger, LogLevel } from '../framework/logger.ts';

const logger = createLogger({
  name: 'SolanaInfuraWS',
  level: LogLevel.INFO,
});

const SOLANA_ROUTE = /^\/(?<network>mainnet|devnet)(?<upstreamPath>\/.*)?$/u;
const SOLANA_BALANCE_RPC_METHODS = new Set([
  'getBalance',
  'getTokenAccountBalance',
  'getTokenAccountsByOwner',
  'getMultipleAccounts',
  'getAccountInfo',
]);

type SolanaNetwork = 'mainnet' | 'devnet';

interface SolanaInfuraConnection {
  network: SolanaNetwork;
  upstreamUrl: string;
  redactedUpstreamUrl: string;
}

interface JsonRpcLikeMessage {
  id?: unknown;
  method?: unknown;
  result?: unknown;
  error?: unknown;
}

function getSafeCloseCode(code: number): number {
  return code >= 1000 && code < 5000 && code !== 1005 && code !== 1006
    ? code
    : 1011;
}

function redactSolanaInfuraUrl(url: string): string {
  const parsedUrl = new URL(url);
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  parsedUrl.pathname =
    pathSegments.length > 0
      ? `/${pathSegments.map(() => '<redacted>').join('/')}`
      : '/';
  parsedUrl.search = parsedUrl.search ? '?<redacted>' : '';

  return parsedUrl.toString();
}

function getRawDataByteLength(data: RawData): number {
  if (Array.isArray(data)) {
    return data.reduce((total, chunk) => total + chunk.byteLength, 0);
  }

  return data.byteLength;
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }

  return data.toString('utf8');
}

function getSolanaInfuraConnection(
  request: IncomingMessage,
): SolanaInfuraConnection | null {
  const requestUrl = new URL(request.url || '/', 'ws://localhost');
  const match = requestUrl.pathname.match(SOLANA_ROUTE);
  const network = match?.groups?.network;

  if (!match || (network !== 'mainnet' && network !== 'devnet')) {
    return null;
  }

  const upstreamPath = match.groups?.upstreamPath || '/';
  const upstreamUrl = `wss://solana-${network}.infura.io${upstreamPath}${requestUrl.search}`;

  return {
    network,
    upstreamUrl,
    redactedUpstreamUrl: redactSolanaInfuraUrl(upstreamUrl),
  };
}

function parseJsonRpcMessages(message: string): JsonRpcLikeMessage[] {
  try {
    const parsed = JSON.parse(message) as
      | JsonRpcLikeMessage
      | JsonRpcLikeMessage[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function summarizeJsonRpcMessage(message: string): {
  summary: string;
  methods: string[];
  isBalanceCandidate: boolean;
} {
  const parsedMessages = parseJsonRpcMessages(message);

  if (parsedMessages.length === 0) {
    return {
      summary: `bytes=${message.length} non-json`,
      methods: [],
      isBalanceCandidate: false,
    };
  }

  const methods = parsedMessages
    .map((entry) => entry.method)
    .filter((method): method is string => typeof method === 'string');
  const ids = parsedMessages
    .map((entry) => entry.id)
    .filter((id) => id !== undefined)
    .map((id) => String(id));
  const hasResult = parsedMessages.some((entry) => entry.result !== undefined);
  const hasError = parsedMessages.some((entry) => entry.error !== undefined);
  const summaryParts = [
    `messages=${parsedMessages.length}`,
    methods.length ? `methods=${Array.from(new Set(methods)).join(',')}` : '',
    ids.length ? `ids=${ids.slice(0, 5).join(',')}` : '',
    hasResult ? 'hasResult=true' : '',
    hasError ? 'hasError=true' : '',
  ].filter(Boolean);

  return {
    summary: summaryParts.join(' '),
    methods,
    isBalanceCandidate: methods.some((method) =>
      SOLANA_BALANCE_RPC_METHODS.has(method),
    ),
  };
}

function logSolanaInfuraMessage(
  marker: string,
  connection: SolanaInfuraConnection,
  data: RawData,
  isBinary: boolean,
): void {
  if (isBinary) {
    logger.warn(
      `[${marker}] network=${
        connection.network
      } upstream=${connection.redactedUpstreamUrl} binaryBytes=${getRawDataByteLength(
        data,
      )}`,
    );
    return;
  }

  const message = rawDataToString(data);
  const { summary, methods, isBalanceCandidate } =
    summarizeJsonRpcMessage(message);

  logger.warn(
    `[${marker}] network=${connection.network} upstream=${connection.redactedUpstreamUrl} ${summary}`,
  );

  if (isBalanceCandidate) {
    logger.warn(
      `[E2E_SOLANA_BALANCE_WS_CANDIDATE] network=${
        connection.network
      } upstream=${connection.redactedUpstreamUrl} methods=${Array.from(
        new Set(methods),
      ).join(',')}`,
    );
  }
}

function sendWhenOpen(
  socket: WebSocket,
  data: RawData,
  isBinary: boolean,
): boolean {
  if (socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(data, { binary: isBinary });
  return true;
}

export async function setupSolanaInfuraMocks(
  server: LocalWebSocketServer,
): Promise<void> {
  const wsServer = server.getServer();

  wsServer.on(
    'connection',
    (clientSocket: WebSocket, request: IncomingMessage) => {
      const connection = getSolanaInfuraConnection(request);

      if (!connection) {
        logger.warn(
          `[E2E_SOLANA_INFURA_WS_REJECTED] Unsupported local Solana WS route: ${
            request.url || 'unknown-url'
          }`,
        );
        clientSocket.close(1008, 'Unsupported Solana Infura route');
        return;
      }

      logger.warn(
        `[E2E_SOLANA_INFURA_WS_CONNECTED] network=${connection.network} upstream=${connection.redactedUpstreamUrl}`,
      );

      const upstreamSocket = new WebSocket(connection.upstreamUrl);
      const pendingMessages: { data: RawData; isBinary: boolean }[] = [];

      clientSocket.on('message', (data, isBinary) => {
        logSolanaInfuraMessage(
          'E2E_SOLANA_INFURA_WS_CLIENT_MESSAGE',
          connection,
          data,
          isBinary,
        );

        if (!sendWhenOpen(upstreamSocket, data, isBinary)) {
          pendingMessages.push({ data, isBinary });
        }
      });

      upstreamSocket.on('open', () => {
        logger.warn(
          `[E2E_SOLANA_INFURA_WS_UPSTREAM_OPEN] network=${connection.network} upstream=${connection.redactedUpstreamUrl}`,
        );

        while (pendingMessages.length > 0) {
          const pendingMessage = pendingMessages.shift();
          if (!pendingMessage) {
            continue;
          }
          sendWhenOpen(
            upstreamSocket,
            pendingMessage.data,
            pendingMessage.isBinary,
          );
        }
      });

      upstreamSocket.on('message', (data, isBinary) => {
        logSolanaInfuraMessage(
          'E2E_SOLANA_INFURA_WS_UPSTREAM_MESSAGE',
          connection,
          data,
          isBinary,
        );
        sendWhenOpen(clientSocket, data, isBinary);
      });

      clientSocket.on('close', (code, reason) => {
        logger.warn(
          `[E2E_SOLANA_INFURA_WS_CLIENT_CLOSE] network=${
            connection.network
          } code=${code} reason=${reason.toString()}`,
        );
        if (upstreamSocket.readyState === WebSocket.OPEN) {
          upstreamSocket.close(getSafeCloseCode(code), reason);
        } else if (upstreamSocket.readyState === WebSocket.CONNECTING) {
          upstreamSocket.terminate();
        }
      });

      upstreamSocket.on('close', (code, reason) => {
        logger.warn(
          `[E2E_SOLANA_INFURA_WS_UPSTREAM_CLOSE] network=${
            connection.network
          } code=${code} reason=${reason.toString()}`,
        );
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.close(getSafeCloseCode(code), reason);
        }
      });

      upstreamSocket.on('error', (error) => {
        logger.warn(
          `[E2E_SOLANA_INFURA_WS_UPSTREAM_ERROR] network=${connection.network} upstream=${connection.redactedUpstreamUrl} error=${error.message}`,
        );
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.close(1011, 'Solana Infura upstream error');
        }
      });
    },
  );
}
