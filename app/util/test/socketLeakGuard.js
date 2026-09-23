/**
 * Closes sockets that outlive a test file.
 *
 * A request still in flight when a suite ends keeps its socket open. Node
 * tears it down later — typically while an unrelated suite is running — and
 * the resulting error ("write ECANCELED Canceled because of SSL destruction")
 * is reported against that innocent suite, with no stack pointing anywhere
 * useful. The socket also keeps the finished suite's module registry
 * reachable, the same way a pending timer does.
 *
 * Closing them in a root-level `afterAll`, with the teardown error swallowed,
 * keeps the fallout inside the file that opened them.
 *
 * `net.Socket#connect` is the single funnel for real and nock-mocked sockets
 * alike, but `net` is a core module shared by every Jest module registry, so
 * the prototype is patched once and each file swaps in its own collector.
 */

/* eslint-disable import-x/no-commonjs */

// eslint-disable-next-line import-x/no-nodejs-modules
const net = require('net');

const PATCHED = Symbol.for('metamask.socketLeakGuard.patched');
const COLLECTOR = Symbol.for('metamask.socketLeakGuard.collector');

/**
 * Collects the sockets opened through `socketPrototype` from now on.
 *
 * @param {object} socketPrototype - Prototype carrying a `connect` method.
 * @returns {() => void} Closes every socket still open at call time.
 */
const trackOpenSockets = (socketPrototype) => {
  const sockets = new Set();

  if (!socketPrototype.connect[PATCHED]) {
    const originalConnect = socketPrototype.connect;

    const trackedConnect = function trackedConnect(...args) {
      const collector = socketPrototype[COLLECTOR];

      if (collector) {
        collector.add(this);
        this.once?.('close', () => collector.delete(this));
      }

      return originalConnect.apply(this, args);
    };

    trackedConnect[PATCHED] = true;
    socketPrototype.connect = trackedConnect;
  }

  socketPrototype[COLLECTOR] = sockets;

  return () => {
    sockets.forEach((socket) => {
      // Destroying a TLS socket mid-write emits on the socket itself; without
      // a listener Node escalates it to an uncaught error.
      socket.on?.('error', () => undefined);
      socket.destroy?.();
    });
    sockets.clear();

    if (socketPrototype[COLLECTOR] === sockets) {
      socketPrototype[COLLECTOR] = null;
    }
  };
};

const installSocketLeakGuard = () => {
  const closeOpenSockets = trackOpenSockets(net.Socket.prototype);

  afterAll(closeOpenSockets);
};

module.exports = { installSocketLeakGuard, trackOpenSockets };
