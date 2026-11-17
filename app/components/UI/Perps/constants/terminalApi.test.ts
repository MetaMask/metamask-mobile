import {
  getTerminalApiUrl,
  getTerminalOutreachUrl,
  resolveTerminalApiHost,
  TERMINAL_API_HOSTS,
  TERMINAL_API_PATHS,
} from './terminalApi';

describe('resolveTerminalApiHost', () => {
  it.each([
    ['dev', undefined, TERMINAL_API_HOSTS.DEV],
    ['test', undefined, TERMINAL_API_HOSTS.DEV],
    ['e2e', 'beta', TERMINAL_API_HOSTS.DEV],
    ['production', 'beta', TERMINAL_API_HOSTS.UAT],
    ['production', 'main', TERMINAL_API_HOSTS.PRD],
    ['rc', 'main', TERMINAL_API_HOSTS.PRD],
    ['exp', 'main', TERMINAL_API_HOSTS.UAT],
    ['local', undefined, TERMINAL_API_HOSTS.UAT],
    [undefined, undefined, TERMINAL_API_HOSTS.UAT],
  ])('maps env=%s buildType=%s', (environment, buildType, expectedHost) => {
    const result = resolveTerminalApiHost(environment, buildType);

    expect(result).toBe(expectedHost);
  });
});

describe('getTerminalApiUrl', () => {
  it('joins the host with the market-data path', () => {
    const result = getTerminalApiUrl(TERMINAL_API_HOSTS.PRD);

    expect(result).toBe(
      `${TERMINAL_API_HOSTS.PRD}${TERMINAL_API_PATHS.MARKET_DATA}`,
    );
  });
});

describe('getTerminalOutreachUrl', () => {
  it.each([
    [
      TERMINAL_API_HOSTS.DEV,
      `${TERMINAL_API_HOSTS.DEV}${TERMINAL_API_PATHS.OUTREACH}`,
    ],
    [
      TERMINAL_API_HOSTS.UAT,
      `${TERMINAL_API_HOSTS.UAT}${TERMINAL_API_PATHS.OUTREACH}`,
    ],
    [
      TERMINAL_API_HOSTS.PRD,
      `${TERMINAL_API_HOSTS.PRD}${TERMINAL_API_PATHS.OUTREACH}`,
    ],
  ])('joins %s with the outreach path', (host, expectedUrl) => {
    const result = getTerminalOutreachUrl(host);

    expect(result).toBe(expectedUrl);
  });
});
