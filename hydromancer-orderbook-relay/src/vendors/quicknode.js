import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { toOrderBookData } from '../orderBook.js';

const LEVELS = 20;
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 2000;
const PROTO_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../proto/orderbook.proto',
);

/**
 * One StreamL2Book call per coin+aggregation. QuickNode takes a single coin
 * per request, so the relay opens one gRPC stream for each active market and
 * fans the resulting snapshots out over the local WebSocket.
 *
 * @param {{
 *   endpoint: string,
 *   token: string,
 *   onBook: (coin: string, orderBook: object, vendorTime: number) => void,
 *   onLog?: (message: string) => void,
 * }} options
 */
export function createQuickNodeVendor({ endpoint, token, onBook, onLog }) {
  const log = onLog ?? (() => undefined);
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition).hyperliquid;
  /** @type {Map<string, { cancel: () => void }>} */
  const streams = new Map();

  function createClient() {
    return new proto.OrderBookStreaming(
      endpoint,
      grpc.credentials.createSsl(),
      { 'grpc.max_receive_message_length': 100 * 1024 * 1024 },
    );
  }

  function streamKey(coin, aggregation) {
    return `${coin}:${aggregation.nSigFigs ?? ''}:${aggregation.mantissa ?? ''}`;
  }

  function startStream(coin, aggregation) {
    const key = streamKey(coin, aggregation);
    if (streams.has(key)) {
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let retryTimer = null;
    /** @type {{ close?: () => void } | null} */
    let activeCall = null;
    /** @type {{ close?: () => void } | null} */
    let activeClient = null;

    const stopActive = () => {
      try {
        activeCall?.cancel?.();
      } catch {
        // Ignore cancel races while the call is already closing.
      }
      activeCall = null;
      try {
        activeClient?.close?.();
      } catch {
        // Ignore close races.
      }
      activeClient = null;
    };

    const connect = () => {
      if (cancelled) {
        return;
      }
      stopActive();
      const client = createClient();
      activeClient = client;
      const metadata = new grpc.Metadata();
      metadata.add('x-token', token);
      const request = {
        coin,
        n_levels: LEVELS,
      };
      if (aggregation.nSigFigs) {
        request.n_sig_figs = aggregation.nSigFigs;
      }
      if (aggregation.mantissa) {
        request.mantissa = aggregation.mantissa;
      }

      log(
        `quicknode subscribe ${coin} nSigFigs=${aggregation.nSigFigs ?? 'raw'} mantissa=${aggregation.mantissa ?? '-'}`,
      );
      const call = client.StreamL2Book(request, metadata);
      activeCall = call;

      call.on('data', (update) => {
        if (cancelled || !update || update.coin !== coin) {
          return;
        }
        retryCount = 0;
        const vendorTime = Number(update.time);
        const orderBook = toOrderBookData({
          coin: update.coin,
          time: vendorTime,
          bids: update.bids ?? [],
          asks: update.asks ?? [],
        });
        onBook(
          coin,
          orderBook,
          Number.isFinite(vendorTime) ? vendorTime : Date.now(),
        );
      });

      call.on('error', (error) => {
        if (cancelled) {
          return;
        }
        const isDataLoss = error?.code === grpc.status.DATA_LOSS;
        log(
          `quicknode stream error ${coin}: ${error?.code ?? 'unknown'} ${error?.details ?? error?.message ?? ''}`,
        );
        stopActive();
        if (!isDataLoss || retryCount >= MAX_RETRIES) {
          return;
        }
        retryCount += 1;
        const delay = BASE_DELAY_MS * 2 ** (retryCount - 1);
        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, delay);
      });

      call.on('end', () => {
        if (cancelled) {
          return;
        }
        log(`quicknode stream ended ${coin}, reconnecting`);
        stopActive();
        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, BASE_DELAY_MS);
      });
    };

    connect();
    streams.set(key, {
      cancel: () => {
        cancelled = true;
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        stopActive();
        streams.delete(key);
        log(`quicknode unsubscribed ${coin}`);
      },
    });
  }

  return {
    /**
     * Ensures a live StreamL2Book for this coin+aggregation.
     *
     * @param {string} coin
     * @param {{ nSigFigs?: number, mantissa?: number }} aggregation
     */
    ensure(coin, aggregation) {
      startStream(coin, aggregation);
    },

    /**
     * Tears down the stream for this coin+aggregation.
     *
     * @param {string} coin
     * @param {{ nSigFigs?: number, mantissa?: number }} aggregation
     */
    release(coin, aggregation) {
      streams.get(streamKey(coin, aggregation))?.cancel();
    },

    /** Closes every active QuickNode stream. */
    close() {
      for (const stream of [...streams.values()]) {
        stream.cancel();
      }
    },

    get activeCount() {
      return streams.size;
    },
  };
}
