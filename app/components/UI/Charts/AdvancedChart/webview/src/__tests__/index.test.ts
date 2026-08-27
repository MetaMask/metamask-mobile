/**
 * @jest-environment jsdom
 */
import { __resetStateForTests } from '../core/state';
import { __resetHandlersForTests } from '../messages/handler';
import { __resetThemeForTests } from '../widget/theme';
import { __resetOhlcvIngestionForTests } from '../widget/ohlcvIngestion';
import type { ChartConfig, ChartTheme } from '../core/types';

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

describe('src/index.ts entry point', () => {
  let bridge: MockBridge;

  beforeEach(() => {
    __resetStateForTests();
    __resetHandlersForTests();
    __resetThemeForTests();
    __resetOhlcvIngestionForTests();
    bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: MockBridge }
    ).ReactNativeWebView = bridge;
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = baseConfig;

    jest
      .spyOn(document, 'createElement')
      .mockImplementation(((tag: string) =>
        tag === 'script'
          ? ({} as unknown as HTMLScriptElement)
          : ({} as HTMLElement)) as never);
    jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation(((node: Node) => node) as never);
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(document, 'addEventListener').mockImplementation();

    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('calls bootstrap() and emits DEBUG on import', async () => {
    await import('../index');
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('modular-bootstrap-ready'),
    );
  });

  it('reports error to RN when bootstrap throws', async () => {
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    await import('../index');
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });
});
