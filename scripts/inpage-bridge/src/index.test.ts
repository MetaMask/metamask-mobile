jest.mock('./provider', () => jest.fn());
jest.mock('./solanaWalletStandard', () => jest.fn());
jest.mock('./bitcoinWalletStandard', () => jest.fn());

/**
 * Runs the inpage bridge entrypoint as a page on `hostname` would, and reports
 * whether the provider was injected into that page.
 *
 * @param hostname - The hostname of the page loading the bridge.
 * @returns {boolean} {@code true} if the provider was injected.
 */
const injectsProviderOn = (hostname: string) => {
  const documentStub = { doctype: { name: 'html' }, readyState: 'complete' };

  Object.defineProperty(global, 'document', {
    configurable: true,
    value: documentStub,
  });
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      document: documentStub,
      location: { hostname, pathname: '/' },
      _metamaskSetupProvider: jest.fn(),
      addEventListener: jest.fn(),
    },
  });

  jest.resetModules();
  jest.requireActual('./index');

  const injectInpageProvider = jest.requireMock('./provider') as jest.Mock;
  return injectInpageProvider.mock.calls.length > 0;
};

describe('inpage bridge injection', () => {
  it('injects the provider on a regular dapp', () => {
    expect(injectsProviderOn('app.uniswap.org')).toBe(true);
  });

  // The Snaps execution sandbox runs untrusted code and must never receive the
  // provider, on any of the domains it is served from.
  it.each([
    'execution.metamask.com',
    'execution.metamask.io',
    'execution.consensys.io',
  ])('does not inject the provider on %s', (hostname) => {
    expect(injectsProviderOn(hostname)).toBe(false);
  });

  it('does not inject the provider on a subdomain of the execution sandbox', () => {
    expect(injectsProviderOn('sandbox.execution.metamask.com')).toBe(false);
  });

  // Hosts are matched whole, not as substrings, so a look-alike host is an
  // ordinary site rather than a match for the sandbox entry.
  it.each([
    'execution.metamask.com.attacker.com',
    'notexecution.metamask.com',
    'execution.metamask.community',
  ])('treats the look-alike host %s as a regular dapp', (hostname) => {
    expect(injectsProviderOn(hostname)).toBe(true);
  });
});
