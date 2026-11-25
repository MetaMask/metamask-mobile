import { trackOpenSockets } from './socketLeakGuard';

describe('trackOpenSockets', () => {
  const createSocketPrototype = () => ({ connect: jest.fn() });

  const createSocket = (prototype) => {
    const listeners = {};
    return Object.assign(Object.create(prototype), {
      destroy: jest.fn(),
      on: jest.fn((event, listener) => {
        listeners[event] = listener;
      }),
      once: jest.fn((event, listener) => {
        listeners[event] = listener;
      }),
      emit: (event) => listeners[event]?.(),
    });
  };

  it('still connects through the original implementation', () => {
    const prototype = createSocketPrototype();
    const originalConnect = prototype.connect;
    const socket = createSocket(prototype);

    trackOpenSockets(prototype);
    socket.connect({ host: 'example.com', port: 443 });

    expect(originalConnect).toHaveBeenCalledWith({
      host: 'example.com',
      port: 443,
    });
  });

  it('closes a socket that is still open', () => {
    const prototype = createSocketPrototype();
    const socket = createSocket(prototype);

    const closeOpenSockets = trackOpenSockets(prototype);
    socket.connect({ host: 'example.com' });
    closeOpenSockets();

    expect(socket.destroy).toHaveBeenCalled();
  });

  it('swallows the error raised by closing a socket mid-write', () => {
    const prototype = createSocketPrototype();
    const socket = createSocket(prototype);

    const closeOpenSockets = trackOpenSockets(prototype);
    socket.connect({ host: 'example.com' });
    closeOpenSockets();

    expect(socket.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(() => socket.emit('error')).not.toThrow();
  });

  it('forgets a socket that closed on its own', () => {
    const prototype = createSocketPrototype();
    const socket = createSocket(prototype);

    const closeOpenSockets = trackOpenSockets(prototype);
    socket.connect({ host: 'example.com' });
    socket.emit('close');
    closeOpenSockets();

    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it('hands tracking over to the next test file', () => {
    const prototype = createSocketPrototype();
    const firstFileSocket = createSocket(prototype);
    const secondFileSocket = createSocket(prototype);

    const closeFirstFileSockets = trackOpenSockets(prototype);
    firstFileSocket.connect({ host: 'example.com' });
    closeFirstFileSockets();

    // Core modules are shared, so the second file re-installs on a prototype
    // that is already patched.
    const closeSecondFileSockets = trackOpenSockets(prototype);
    secondFileSocket.connect({ host: 'example.com' });
    closeSecondFileSockets();

    expect(secondFileSocket.destroy).toHaveBeenCalled();
    expect(firstFileSocket.destroy).toHaveBeenCalledTimes(1);
  });
});
