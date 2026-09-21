import {
  getTerminalOutreachUrl,
  resolveTerminalOutreachUrl,
  TERMINAL_API_URLS,
} from './terminalApi';

describe('resolveTerminalOutreachUrl', () => {
  it.each([
    [
      TERMINAL_API_URLS.DEV,
      'https://terminal.dev-api.cx.metamask.io/v1/outreach',
    ],
    [
      TERMINAL_API_URLS.UAT,
      'https://terminal.uat-api.cx.metamask.io/v1/outreach',
    ],
    [TERMINAL_API_URLS.PRD, 'https://terminal.api.cx.metamask.io/v1/outreach'],
  ])('maps %s to the outreach endpoint', (marketDataUrl, expectedUrl) => {
    const result = resolveTerminalOutreachUrl(marketDataUrl);

    expect(result).toBe(expectedUrl);
  });
});

describe('getTerminalOutreachUrl', () => {
  it('uses the resolved mobile build host', () => {
    const result = getTerminalOutreachUrl(TERMINAL_API_URLS.PRD);

    expect(result).toBe('https://terminal.api.cx.metamask.io/v1/outreach');
  });
});
