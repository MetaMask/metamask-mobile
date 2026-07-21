/**
 * @jest-environment jsdom
 */
import {
  loadTradingViewLibrary,
  __resetLoadLibraryForTests,
} from '../loadLibrary';
import { __resetStateForTests } from '../state';

interface ScriptStub {
  type?: string;
  src?: string;
  onload?: () => void;
  onerror?: () => void;
}

describe('core/loadLibrary', () => {
  let script: ScriptStub;
  let appendSpy: jest.SpyInstance;

  beforeEach(() => {
    __resetStateForTests();
    __resetLoadLibraryForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
    script = {};
    const createElementImpl = (tag: string): HTMLElement => {
      if (tag === 'script') return script as unknown as HTMLScriptElement;
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
    jest.restoreAllMocks();
  });

  it('appends the charting_library.js script with the correct URL', () => {
    const promise = loadTradingViewLibrary('https://cdn.example.com/');
    expect(script.src).toBe('https://cdn.example.com/charting_library.js');
    expect(appendSpy).toHaveBeenCalledTimes(1);

    script.onload?.();
    return expect(promise).resolves.toBeUndefined();
  });

  it('rejects when the script onerror fires', async () => {
    const promise = loadTradingViewLibrary('https://cdn.example.com/');
    script.onerror?.();
    await expect(promise).rejects.toThrow(/Failed to load TradingView library/);
  });

  it('resolves immediately on subsequent calls once loaded', async () => {
    const first = loadTradingViewLibrary('https://cdn.example.com/');
    script.onload?.();
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

    script.onload?.();
    await first;
    await second;
  });

  it('rejects subsequent calls if the prior load errored', async () => {
    const first = loadTradingViewLibrary('https://cdn.example.com/');
    script.onerror?.();
    await expect(first).rejects.toThrow();

    await expect(
      loadTradingViewLibrary('https://cdn.example.com/'),
    ).rejects.toThrow(/Failed to load TradingView library/);
  });
});
