/**
 * @jest-environment node
 */

jest.mock('./AppiumWebMatchers.ts', () => ({
  __esModule: true,
  default: {
    withWebViewAction: jest.fn().mockResolvedValue(undefined),
  },
}));

import WebView from './WebView';
import AppiumWebMatchers from './AppiumWebMatchers';

describe('WebView Appium facades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards withWebViewAction to AppiumWebMatchers', async () => {
    const action = jest.fn().mockResolvedValue(undefined);

    await WebView.withWebViewAction('https://example.test', action);

    expect(AppiumWebMatchers.withWebViewAction).toHaveBeenCalledWith(
      'https://example.test',
      action,
    );
  });
});
