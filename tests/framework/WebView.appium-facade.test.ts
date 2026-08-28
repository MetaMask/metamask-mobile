/**
 * @jest-environment node
 */

jest.mock('./PlaywrightWebMatchers.ts', () => ({
  __esModule: true,
  default: {
    withWebViewAction: jest.fn().mockResolvedValue(undefined),
  },
}));

import WebView from './WebView';
import PlaywrightWebMatchers from './PlaywrightWebMatchers';

describe('WebView Appium facades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards withWebViewAction to PlaywrightWebMatchers', async () => {
    const action = jest.fn().mockResolvedValue(undefined);

    await WebView.withWebViewAction('https://example.test', action);

    expect(PlaywrightWebMatchers.withWebViewAction).toHaveBeenCalledWith(
      'https://example.test',
      action,
    );
  });
});
