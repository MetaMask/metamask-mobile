import { createServer } from 'node:http';
import { acceptWebSocket, sendText } from './clientSocket.js';
import { toOrderBookData } from './orderBook.js';

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.HYDROMANCER_API_KEY?.trim() ?? '';
const LEVELS = 20;
const MAX_MARKETS = 32;

if (!API_KEY) {
  console.error(
    'Missing HYDROMANCER_API_KEY. Copy .env.example to .env in hydromancer-orderbook-relay/ and paste the key there.',
  );
  process.exit(1);
}

/** @type {Map<import('node:stream').Duplex, Set<string>>} */
const clientCoins = new Map();
/** @type {Map<string, Set<import('node:stream').Duplex>>} */
const coinClients = new Map();
/** @type {Map<string, object>} */
const books = new Map();

/** @type {WebSocket | null} */
let vendor = null;
let vendorReady = false;
let reconnectTimer = null;
/** Coins currently registered with Hydromancer. */
let activeCoins = [];
/** Aggregation signature of the live vendor subscription. */
let activeSignature = '';
/** @type {Map<string, { nSigFigs?: number, mantissa?: number }>} */
const coinAggregation = new Map();
/** Last per-subscription seq. Null after a gap or a resubscribe. */
let lastSeq = null;

function log(message) {
  console.log(`[hydromancer-relay] ${message}`);
}

function broadcast(coin, message) {
  const payload = JSON.stringify(message);
  for (const socket of coinClients.get(coin) ?? []) {
    sendText(socket, payload);
  }
}

function desiredCoins() {
  return [...coinClients.keys()].sort();
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

function desiredSignature() {
  return desiredCoins()
    .map((coin) => {
      const params = coinAggregation.get(coin) ?? {};
      return `${coin}:${params.nSigFigs ?? ''}:${params.mantissa ?? ''}`;
    })
    .join('|');
}

function sendVendor(message) {
  if (!vendor || vendor.readyState !== WebSocket.OPEN) {
    return;
  }
  vendor.send(JSON.stringify(message));
}

function syncVendorSubscription() {
  const next = desiredCoins();
  const signature = desiredSignature();
  if (!vendorReady || signature === activeSignature) {
    return;
  }
  if (activeCoins.length > 0) {
    sendVendor({
      method: 'unsubscribe',
      subscription: { type: 'l2Book', coins: activeCoins },
    });
  }
  activeCoins = next;
  activeSignature = signature;
  lastSeq = null;
  for (const coin of next) {
    books.delete(coin);
  }
  if (next.length === 0) {
    return;
  }
  const params = coinAggregation.get(next[0]) ?? {};
  sendVendor({
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
    `subscribed ${next.join(', ')} nSigFigs=${params.nSigFigs ?? 'raw'} mantissa=${params.mantissa ?? '-'}`,
  );
}

function connectVendor() {
  if (
    vendor &&
    (vendor.readyState === WebSocket.CONNECTING ||
      vendor.readyState === WebSocket.OPEN)
  ) {
    return;
  }
  vendorReady = false;
  const socket = new WebSocket(
    `wss://api.hydromancer.xyz/ws?token=${encodeURIComponent(API_KEY)}`,
  );
  vendor = socket;

  socket.addEventListener('message', (event) => {
    if (vendor !== socket) {
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
    handleVendorMessage(message);
  });

  socket.addEventListener('close', () => {
    if (vendor !== socket) {
      return;
    }
    vendorReady = false;
    activeCoins = [];
    activeSignature = '';
    lastSeq = null;
    log('vendor socket closed, reconnecting');
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    if (vendor !== socket) {
      return;
    }
    log('vendor socket error');
    socket.close();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectVendor();
  }, 1000);
}

function handleVendorMessage(message) {
  if (message.type === 'connected') {
    vendorReady = true;
    activeCoins = [];
    activeSignature = '';
    syncVendorSubscription();
    return;
  }
  if (message.type === 'ping') {
    sendVendor({ type: 'pong' });
    return;
  }
  if (message.type !== 'l2Book') {
    return;
  }

  if (typeof message.seq === 'number') {
    if (lastSeq !== null && message.seq !== lastSeq + 1) {
      log(`seq gap ${lastSeq} -> ${message.seq}, dropping books`);
      for (const coin of desiredCoins()) {
        books.delete(coin);
        broadcast(coin, { type: 'reset', coin });
      }
      lastSeq = null;
      return;
    }
    lastSeq = message.seq;
  }

  const snapshots = Array.isArray(message.data) ? message.data : [message.data];
  const relayTime = Date.now();
  for (const snapshot of snapshots) {
    if (
      !snapshot ||
      typeof snapshot.coin !== 'string' ||
      !coinClients.has(snapshot.coin)
    ) {
      continue;
    }
    const expected = coinAggregation.get(snapshot.coin) ?? {};
    if (expected.nSigFigs && message.nSigFigs !== expected.nSigFigs) {
      continue;
    }
    if (expected.mantissa && message.mantissa !== expected.mantissa) {
      continue;
    }
    const orderBook = toOrderBookData(snapshot);
    books.set(snapshot.coin, orderBook);
    broadcast(snapshot.coin, {
      type: 'l2Book',
      coin: snapshot.coin,
      orderBook,
      vendorTime: snapshot.time,
      relayTime,
    });
  }
}

function addClientCoin(socket, coin, aggregation) {
  if (!/^[A-Za-z0-9:_-]{1,32}$/.test(coin)) {
    sendText(
      socket,
      JSON.stringify({ type: 'error', message: 'invalid coin' }),
    );
    return;
  }
  if (!coinClients.has(coin) && coinClients.size >= MAX_MARKETS) {
    sendText(
      socket,
      JSON.stringify({ type: 'error', message: 'too many markets' }),
    );
    return;
  }

  let coins = clientCoins.get(socket);
  if (!coins) {
    coins = new Set();
    clientCoins.set(socket, coins);
  }
  coins.add(coin);

  let sockets = coinClients.get(coin);
  if (!sockets) {
    sockets = new Set();
    coinClients.set(coin, sockets);
  }
  const wasEmpty = sockets.size === 0;
  sockets.add(socket);
  const previous = coinAggregation.get(coin);
  const aggregationChanged =
    previous?.nSigFigs !== aggregation.nSigFigs ||
    previous?.mantissa !== aggregation.mantissa;
  coinAggregation.set(coin, aggregation);
  if (aggregationChanged) {
    books.delete(coin);
  }

  const cached = books.get(coin);
  if (cached) {
    sendText(
      socket,
      JSON.stringify({
        type: 'l2Book',
        coin,
        orderBook: cached,
        vendorTime: cached.lastUpdated,
        relayTime: Date.now(),
      }),
    );
  }
  if (wasEmpty || aggregationChanged) {
    connectVendor();
    syncVendorSubscription();
  }
}

function removeClientCoin(socket, coin) {
  clientCoins.get(socket)?.delete(coin);
  const sockets = coinClients.get(coin);
  if (!sockets) {
    return;
  }
  sockets.delete(socket);
  if (sockets.size === 0) {
    coinClients.delete(coin);
    coinAggregation.delete(coin);
    books.delete(coin);
    syncVendorSubscription();
  }
}

function removeClient(socket) {
  const coins = clientCoins.get(socket);
  clientCoins.delete(socket);
  for (const coin of coins ?? []) {
    removeClientCoin(socket, coin);
  }
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        ok: true,
        vendorReady,
        markets: desiredCoins(),
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
      if (message.type === 'subscribe' && typeof message.coin === 'string') {
        addClientCoin(socket, message.coin, normalizeAggregation(message));
      } else if (
        message.type === 'unsubscribe' &&
        typeof message.coin === 'string'
      ) {
        removeClientCoin(socket, message.coin);
      }
    },
    onClose: () => {
      removeClient(socket);
    },
  });
});

server.listen(PORT, () => {
  log(`listening on ws://localhost:${PORT}`);
});
