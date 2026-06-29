/**
 * @jest-environment jsdom
 */
import { bootstrap } from '../bootstrap';
import { __resetStateForTests, getTheme } from '../state';
import {
  __resetHandlersForTests,
  dispatchInboundMessage,
} from '../../messages/handler';
import { __resetThemeForTests } from '../../widget/theme';
import type { ChartConfig, ChartTheme } from '../types';

const baseTheme: ChartTheme = {
  backgroundColor: 'rgb(0,0,0)',
  borderColor: 'rgb(17,17,17)',
  textColor: 'rgb(255,255,255)',
  textDefaultColor: 'rgb(255,255,255)',
  sectionBackgroundColor: 'rgb(34,34,34)',
  crosshairBackgroundColor: 'rgb(51,51,51)',
  crosshairTextColor: 'rgb(238,238,238)',
  legendTextColor: 'rgb(170,170,170)',
  textAlternativeColor: 'rgb(187,187,187)',
  successColor: 'rgb(0,255,0)',
  lineColor: 'rgb(171,205,239)',
  errorColor: 'rgb(255,0,0)',
  primaryColor: 'rgb(0,51,255)',
  currentPriceColor: 'rgb(34,34,0)',
};

const baseConfig: ChartConfig = {
  libraryUrl: 'https://cdn.example.com/',
  theme: baseTheme,
};

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

describe('core/bootstrap', () => {
  let bridge: MockBridge;

  beforeEach(() => {
    __resetStateForTests();
    __resetHandlersForTests();
    __resetThemeForTests();
    bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: MockBridge }
    ).ReactNativeWebView = bridge;
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = baseConfig;

    // Prevent loadLibrary from actually appending a script.
    const createElementImpl = (tag: string): HTMLElement => {
      if (tag === 'script') return {} as unknown as HTMLScriptElement;
      return {} as HTMLElement;
    };
    jest
      .spyOn(document, 'createElement')
      .mockImplementation(createElementImpl as never);
    jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation(((node: Node) => node) as never);
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(document, 'addEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('throws when window.CONFIG is missing', () => {
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    expect(() => bootstrap()).toThrow(/window.CONFIG is missing/);
  });

  it('seeds theme state from CONFIG.theme', () => {
    bootstrap();
    expect(getTheme()).toEqual(baseTheme);
  });

  it('emits a DEBUG breadcrumb so RN can confirm the modular bundle booted', () => {
    bootstrap();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"DEBUG"'),
    );
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('modular-bootstrap-ready'),
    );
  });

  it('subscribes to both window and document message events', () => {
    bootstrap();
    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(document.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
  });

  it('registers SET_THEME_COLORS so dispatch updates state.theme', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_THEME_COLORS',
      payload: { lineColor: '#newline' },
    });
    expect(getTheme()?.lineColor).toBe('#newline');
  });
});
