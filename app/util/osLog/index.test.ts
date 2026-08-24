import { osLog } from '.';

describe('osLog', () => {
  const originalWorkerId = process.env.JEST_WORKER_ID;
  let errorSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    // The wrapper no-ops under Jest; clear the guard so behavior is testable.
    delete process.env.JEST_WORKER_ID;
    errorSpy = jest
      .spyOn(globalThis.console, 'error')
      .mockImplementation(() => undefined);
    infoSpy = jest
      .spyOn(globalThis.console, 'info')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.JEST_WORKER_ID = originalWorkerId;
    jest.restoreAllMocks();
  });

  it('writes a tagged error-level line with serialized context by default', () => {
    osLog('MMPushStartup', 'gates', { isUnlocked: true });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[MMPushStartup] gates {"isUnlocked":true}',
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('omits context when not provided', () => {
    osLog('MMPushStartup', 'plain message');

    expect(errorSpy).toHaveBeenCalledWith('[MMPushStartup] plain message');
  });

  it('writes info-level lines when requested', () => {
    osLog('MMPushStartup', 'gates', { a: 1 }, 'info');

    expect(infoSpy).toHaveBeenCalledWith('[MMPushStartup] gates {"a":1}');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not emit when running under Jest (JEST_WORKER_ID set)', () => {
    process.env.JEST_WORKER_ID = '1';

    osLog('MMPushStartup', 'gates', { isUnlocked: true });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('does not throw and reports unserializable context', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    osLog('MMPushStartup', 'ctx', circular);

    expect(errorSpy).toHaveBeenCalledWith(
      '[MMPushStartup] ctx [unserializable context]',
    );
  });

  it('does not throw when console is unavailable', () => {
    const originalConsole = globalThis.console;
    // @ts-expect-error - simulating a runtime without console
    delete globalThis.console;

    expect(() => osLog('MMPushStartup', 'gates')).not.toThrow();

    globalThis.console = originalConsole;
  });
});
