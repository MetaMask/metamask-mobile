/**
 * @jest-environment jsdom
 */
import {
  __resetLoadLibraryForTests,
  LIBRARY_LOAD_ERROR_CODE,
  LIBRARY_LOAD_RETRY_DELAY_MS,
  loadTradingViewLibrary,
  MAX_LIBRARY_LOAD_ATTEMPTS,
} from '../loadLibrary';
import { __resetStateForTests } from '../state';

interface ScriptStub {
  type?: string;
  src?: string;
  onload?: () => void;
  onerror?: () => void;
}

describe('core/loadLibrary', () => {
  let scripts: ScriptStub[];
  let appendSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    __resetStateForTests();
    __resetLoadLibraryForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
    scripts = [];
    const createElementImpl = (tag: string): HTMLElement => {
      if (tag === 'script') {
        const script = {};
        scripts.push(script);
        return script as unknown as HTMLScriptElement;
      }
      return {} as HTMLElement;
    };
    jest
      .spyOn(document, 'createElement')
      .mockImplementation(createElementImpl as never);
    appendSpy = jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation(((node: Node) => node) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('appends the charting_library.js script with the correct URL', () => {
    const promise = loadTradingViewLibrary('https://cdn.example.com/');

    expect(scripts[0].src).toBe('https://cdn.example.com/charting_library.js');
    expect(appendSpy).toHaveBeenCalledTimes(1);

    scripts[0].onload?.();
    return expect(promise).resolves.toBeUndefined();
  });

  it('retries once after the first script error', async () => {
    const promise = loadTradingViewLibrary('https://cdn.example.com/');

    scripts[0].onerror?.();
    jest.advanceTimersByTime(LIBRARY_LOAD_RETRY_DELAY_MS);
    scripts[1].onload?.();

    await expect(promise).resolves.toBeUndefined();
    expect(appendSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects with diagnostics after both attempts fail', async () => {
    const promise = loadTradingViewLibrary('https://cdn.example.com/');

    scripts[0].onerror?.();
    jest.advanceTimersByTime(LIBRARY_LOAD_RETRY_DELAY_MS);
    scripts[1].onerror?.();

    await expect(promise).rejects.toMatchObject({
      message:
        'Failed to load TradingView library. URL: https://cdn.example.com/charting_library.js',
      code: LIBRARY_LOAD_ERROR_CODE,
      url: 'https://cdn.example.com/charting_library.js',
      attempt: MAX_LIBRARY_LOAD_ATTEMPTS,
      maxAttempts: MAX_LIBRARY_LOAD_ATTEMPTS,
      online: expect.any(Boolean),
      visibilityState: expect.any(String),
    });
  });

  it('resolves immediately on subsequent calls once loaded', async () => {
    const first = loadTradingViewLibrary('https://cdn.example.com/');
    scripts[0].onload?.();
    await first;

    // Reset spies to confirm no second script tag is appended.
    appendSpy.mockClear();
    await loadTradingViewLibrary('https://cdn.example.com/');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('second call before onload only appends once', async () => {
    const first = loadTradingViewLibrary('https://cdn.example.com/');
    const second = loadTradingViewLibrary('https://cdn.example.com/');

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    scripts[0].onload?.();
    await first;
    await second;
  });

  it('rejects subsequent calls if the prior load errored', async () => {
    const first = loadTradingViewLibrary('https://cdn.example.com/');

    scripts[0].onerror?.();
    jest.advanceTimersByTime(LIBRARY_LOAD_RETRY_DELAY_MS);
    scripts[1].onerror?.();
    await expect(first).rejects.toThrow();

    appendSpy.mockClear();
    await expect(
      loadTradingViewLibrary('https://cdn.example.com/'),
    ).rejects.toThrow(/Failed to load TradingView library/);
    expect(appendSpy).not.toHaveBeenCalled();
  });
});
