import { createServer } from 'node:http';
import { acceptWebSocket, sendText } from './clientSocket.js';
import { toOrderBookData } from './orderBook.js';
import { createQuickNodeVendor } from './vendors/quicknode.js';

const PORT = Number(process.env.PORT ?? 8787);
const HYDROMANCER_API_KEY = process.env.HYDROMANCER_API_KEY?.trim() ?? '';
const QUICKNODE_GRPC_ENDPOINT =
  process.env.QUICKNODE_GRPC_ENDPOINT?.trim() ?? '';
const QUICKNODE_API_TOKEN = process.env.QUICKNODE_API_TOKEN?.trim() ?? '';
const LEVELS = 20;
const MAX_MARKETS = 32;
const VENDORS = new Set(['hydromancer', 'quicknode']);

const hasHydromancer = HYDROMANCER_API_KEY.length > 0;
const hasQuickNode =
  QUICKNODE_GRPC_ENDPOINT.length > 0 && QUICKNODE_API_TOKEN.length > 0;

if (!hasHydromancer && !hasQuickNode) {
  console.error(
    'Missing vendor credentials. Set HYDROMANCER_API_KEY and/or QUICKNODE_GRPC_ENDPOINT + QUICKNODE_API_TOKEN in hydromancer-orderbook-relay/.env.',
  );
  process.exit(1);
}

/**
 * Subscription identity shared by clients and the cached book.
 * Coins can themselves contain colons (e.g. `xyz:TSLA`), so never split the
 * key on `:` — use `parseBookKey` instead.
 *
 * @param {'hydromancer' | 'quicknode'} vendor
 * @param {string} coin
 */
function bookKey(vendor, coin) {
  return `${vendor}:${coin}`;
}

/**
 * @param {string} key
 * @returns {{ vendor: 'hydromancer' | 'quicknode', coin: string } | null}
 */
function parseBookKey(key) {
  if (key.startsWith('hydromancer:')) {
    return { vendor: 'hydromancer', coin: key.slice('hydromancer:'.length) };
  }
  if (key.startsWith('quicknode:')) {
    return { vendor: 'quicknode', coin: key.slice('quicknode:'.length) };
  }
  return null;
}

/** @type {Map<import('node:stream').Duplex, Set<string>>} */
const clientKeys = new Map();
/** @type {Map<string, Set<import('node:stream').Duplex>>} */
const keyClients = new Map();
/** @type {Map<string, object>} */
const books = new Map();
/** @type {Map<string, { nSigFigs?: number, mantissa?: number }>} */
const keyAggregation = new Map();

/** @type {WebSocket | null} */
let hydromancer = null;
let hydromancerReady = false;
let hydromancerReconnectTimer = null;
/** Coins currently registered with Hydromancer. */
let hydromancerActiveCoins = [];
/** Aggregation signature of the live Hydromancer subscription. */
let hydromancerActiveSignature = '';
/** Last Hydromancer per-subscription seq. Null after a gap or a resubscribe. */
let hydromancerLastSeq = null;

const quickNode = hasQuickNode
  ? createQuickNodeVendor({
      endpoint: QUICKNODE_GRPC_ENDPOINT,
      token: QUICKNODE_API_TOKEN,
      onBook: (coin, orderBook, vendorTime) => {
        const key = bookKey('quicknode', coin);
        if (!keyClients.has(key)) {
          return;
        }
        books.set(key, orderBook);
        broadcast(key, {
          type: 'l2Book',
          vendor: 'quicknode',
          coin,
          orderBook,
          vendorTime,
          relayTime: Date.now(),
        });
      },
      onLog: (message) => log(message),
    })
  : null;

function log(message) {
  console.log(`[orderbook-relay] ${message}`);
}

function broadcast(key, message) {
  const payload = JSON.stringify(message);
  for (const socket of keyClients.get(key) ?? []) {
    sendText(socket, payload);
  }
}

function hydromancerCoins() {
  return [...keyClients.keys()]
    .filter((key) => key.startsWith('hydromancer:'))
    .map((key) => key.slice('hydromancer:'.length))
    .sort();
}

function normalizeAggregation(message) {
  const nSigFigs = [2, 3, 4, 5].includes(message.nSigFigs)
    ? message.nSigFigs
    : undefined;
  const mantissa =
    nSigFigs === 5 && (message.mantissa === 2 || message.mantissa === 5)
      ? message.mantissa
      : undefined;
  return { nSigFigs, mantissa };
}

function normalizeVendor(value) {
  if (typeof value !== 'string') {
    return 'hydromancer';
  }
  return VENDORS.has(value) ? value : null;
}

function hydromancerDesiredSignature() {
  return hydromancerCoins()
    .map((coin) => {
      const params = keyAggregation.get(bookKey('hydromancer', coin)) ?? {};
      return `${coin}:${params.nSigFigs ?? ''}:${params.mantissa ?? ''}`;
    })
    .join('|');
}

function sendHydromancer(message) {
  if (!hydromancer || hydromancer.readyState !== WebSocket.OPEN) {
    return;
  }
  hydromancer.send(JSON.stringify(message));
}

function syncHydromancerSubscription() {
  const next = hydromancerCoins();
  const signature = hydromancerDesiredSignature();
  if (!hydromancerReady || signature === hydromancerActiveSignature) {
    return;
  }
  if (hydromancerActiveCoins.length > 0) {
    sendHydromancer({
      method: 'unsubscribe',
      subscription: { type: 'l2Book', coins: hydromancerActiveCoins },
    });
  }
  hydromancerActiveCoins = next;
  hydromancerActiveSignature = signature;
  hydromancerLastSeq = null;
  for (const coin of next) {
    books.delete(bookKey('hydromancer', coin));
  }
  if (next.length === 0) {
    return;
  }
  const params = keyAggregation.get(bookKey('hydromancer', next[0])) ?? {};
  sendHydromancer({
    method: 'subscribe',
    subscription: {
      type: 'l2Book',
      coins: next,
      nLevels: LEVELS,
      ...(params.nSigFigs ? { nSigFigs: params.nSigFigs } : {}),
      ...(params.mantissa ? { mantissa: params.mantissa } : {}),
    },
  });
  log(
    `hydromancer subscribed ${next.join(', ')} nSigFigs=${params.nSigFigs ?? 'raw'} mantissa=${params.mantissa ?? '-'}`,
  );
}

function connectHydromancer() {
  if (!hasHydromancer) {
    return;
  }
  if (
    hydromancer &&
    (hydromancer.readyState === WebSocket.CONNECTING ||
      hydromancer.readyState === WebSocket.OPEN)
  ) {
    return;
  }
  hydromancerReady = false;
  const socket = new WebSocket(
    `wss://api.hydromancer.xyz/ws?token=${encodeURIComponent(HYDROMANCER_API_KEY)}`,
  );
  hydromancer = socket;

  socket.addEventListener('message', (event) => {
    if (hydromancer !== socket) {
      return;
    }
    let message;
    try {
      const text =
        typeof event.data === 'string' ? event.data : String(event.data);
      message = JSON.parse(text);
    } catch {
      return;
    }
    handleHydromancerMessage(message);
  });

  socket.addEventListener('close', () => {
    if (hydromancer !== socket) {
      return;
    }
    hydromancerReady = false;
    hydromancerActiveCoins = [];
    hydromancerActiveSignature = '';
    hydromancerLastSeq = null;
    log('hydromancer socket closed, reconnecting');
    scheduleHydromancerReconnect();
  });

  socket.addEventListener('error', () => {
    if (hydromancer !== socket) {
      return;
    }
    log('hydromancer socket error');
    socket.close();
  });
}

function scheduleHydromancerReconnect() {
  if (hydromancerReconnectTimer) {
    return;
  }
  hydromancerReconnectTimer = setTimeout(() => {
    hydromancerReconnectTimer = null;
    connectHydromancer();
  }, 1000);
}

function handleHydromancerMessage(message) {
  if (message.type === 'connected') {
    hydromancerReady = true;
    hydromancerActiveCoins = [];
    hydromancerActiveSignature = '';
    syncHydromancerSubscription();
    return;
  }
  if (message.type === 'ping') {
    sendHydromancer({ type: 'pong' });
    return;
  }
  if (message.type !== 'l2Book') {
    return;
  }

  if (typeof message.seq === 'number') {
    if (hydromancerLastSeq !== null && message.seq !== hydromancerLastSeq + 1) {
      log(
        `hydromancer seq gap ${hydromancerLastSeq} -> ${message.seq}, dropping books`,
      );
      for (const coin of hydromancerCoins()) {
        const key = bookKey('hydromancer', coin);
        books.delete(key);
        broadcast(key, { type: 'reset', vendor: 'hydromancer', coin });
      }
      hydromancerLastSeq = null;
      return;
    }
    hydromancerLastSeq = message.seq;
  }

  const snapshots = Array.isArray(message.data) ? message.data : [message.data];
  const relayTime = Date.now();
  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot.coin !== 'string') {
      continue;
    }
    const key = bookKey('hydromancer', snapshot.coin);
    if (!keyClients.has(key)) {
      continue;
    }
    const expected = keyAggregation.get(key) ?? {};
    if (expected.nSigFigs && message.nSigFigs !== expected.nSigFigs) {
      continue;
    }
    if (expected.mantissa && message.mantissa !== expected.mantissa) {
      continue;
    }
    const orderBook = toOrderBookData(snapshot);
    books.set(key, orderBook);
    broadcast(key, {
      type: 'l2Book',
      vendor: 'hydromancer',
      coin: snapshot.coin,
      orderBook,
      vendorTime: snapshot.time,
      relayTime,
    });
  }
}

function addClientCoin(socket, vendor, coin, aggregation) {
  if (!/^[A-Za-z0-9:_-]{1,32}$/.test(coin)) {
    sendText(
      socket,
      JSON.stringify({ type: 'error', vendor, coin, message: 'invalid coin' }),
    );
    return;
  }
  if (vendor === 'hydromancer' && !hasHydromancer) {
    sendText(
      socket,
      JSON.stringify({
        type: 'error',
        vendor,
        coin,
        message: 'hydromancer is not configured on this relay',
      }),
    );
    return;
  }
  if (vendor === 'quicknode' && !quickNode) {
    sendText(
      socket,
      JSON.stringify({
        type: 'error',
        vendor,
        coin,
        message: 'quicknode is not configured on this relay',
      }),
    );
    return;
  }

  const key = bookKey(vendor, coin);
  if (!keyClients.has(key) && keyClients.size >= MAX_MARKETS) {
    sendText(
      socket,
      JSON.stringify({
        type: 'error',
        vendor,
        coin,
        message: 'too many markets',
      }),
    );
    return;
  }

  let keys = clientKeys.get(socket);
  if (!keys) {
    keys = new Set();
    clientKeys.set(socket, keys);
  }
  keys.add(key);

  let sockets = keyClients.get(key);
  if (!sockets) {
    sockets = new Set();
    keyClients.set(key, sockets);
  }
  const wasEmpty = sockets.size === 0;
  sockets.add(socket);
  const previous = keyAggregation.get(key);
  const aggregationChanged =
    previous?.nSigFigs !== aggregation.nSigFigs ||
    previous?.mantissa !== aggregation.mantissa;
  keyAggregation.set(key, aggregation);
  if (aggregationChanged) {
    books.delete(key);
  }

  const cached = books.get(key);
  if (cached) {
    sendText(
      socket,
      JSON.stringify({
        type: 'l2Book',
        vendor,
        coin,
        orderBook: cached,
        vendorTime: cached.lastUpdated,
        relayTime: Date.now(),
      }),
    );
  }

  if (vendor === 'hydromancer' && (wasEmpty || aggregationChanged)) {
    connectHydromancer();
    syncHydromancerSubscription();
  }
  if (vendor === 'quicknode' && (wasEmpty || aggregationChanged)) {
    if (aggregationChanged && previous) {
      quickNode.release(coin, previous);
    }
    quickNode.ensure(coin, aggregation);
  }
}

function removeClientCoin(socket, vendor, coin) {
  const key = bookKey(vendor, coin);
  clientKeys.get(socket)?.delete(key);
  const sockets = keyClients.get(key);
  if (!sockets) {
    return;
  }
  sockets.delete(socket);
  if (sockets.size === 0) {
    const aggregation = keyAggregation.get(key) ?? {};
    keyClients.delete(key);
    keyAggregation.delete(key);
    books.delete(key);
    if (vendor === 'hydromancer') {
      syncHydromancerSubscription();
    }
    if (vendor === 'quicknode' && quickNode) {
      quickNode.release(coin, aggregation);
    }
  }
}

function removeClient(socket) {
  const keys = clientKeys.get(socket);
  clientKeys.delete(socket);
  for (const key of keys ?? []) {
    const parsed = parseBookKey(key);
    if (!parsed) {
      continue;
    }
    removeClientCoin(socket, parsed.vendor, parsed.coin);
  }
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        ok: true,
        vendors: {
          hydromancer: {
            configured: hasHydromancer,
            ready: hydromancerReady,
          },
          quicknode: {
            configured: Boolean(quickNode),
            activeStreams: quickNode?.activeCount ?? 0,
          },
        },
        markets: [...keyClients.keys()],
      }),
    );
    return;
  }
  response.writeHead(404);
  response.end();
});

server.on('upgrade', (request, socket, head) => {
  acceptWebSocket(request, socket, head, {
    onText: (text) => {
      let message;
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      const vendor = normalizeVendor(message.vendor);
      if (!vendor) {
        sendText(
          socket,
          JSON.stringify({
            type: 'error',
            message: 'invalid vendor',
          }),
        );
        return;
      }
      if (message.type === 'subscribe' && typeof message.coin === 'string') {
        addClientCoin(
          socket,
          vendor,
          message.coin,
          normalizeAggregation(message),
        );
      } else if (
        message.type === 'unsubscribe' &&
        typeof message.coin === 'string'
      ) {
        removeClientCoin(socket, vendor, message.coin);
      }
    },
    onClose: () => {
      removeClient(socket);
    },
  });
});

server.listen(PORT, () => {
  log(`listening on ws://localhost:${PORT}`);
  log(
    `vendors: hydromancer=${hasHydromancer ? 'on' : 'off'} quicknode=${hasQuickNode ? 'on' : 'off'}`,
  );
});
