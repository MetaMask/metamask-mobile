jest.mock('./provider', () => jest.fn());
jest.mock('./solanaWalletStandard', () => jest.fn());
jest.mock('./bitcoinWalletStandard', () => jest.fn());

import { blockedDomainCheck } from './index';

const setLocation = (hostname: string) => {
  Object.defineProperty(global, 'window', {
    configurable: true,
    value: {
      location: {
        hostname,
        pathname: '/',
      },
    },
  });
};

describe('blockedDomainCheck', () => {
  it('blocks execution.metamask.com', () => {
    setLocation('execution.metamask.com');

    const result = blockedDomainCheck();

    expect(result).toBe(true);
  });

  it.each(['execution.metamask.io', 'execution.consensys.io'])(
    'continues blocking %s',
    (hostname) => {
      setLocation(hostname);

      const result = blockedDomainCheck();

      expect(result).toBe(true);
    },
  );

  it('blocks subdomains of execution.metamask.com', () => {
    setLocation('sandbox.execution.metamask.com');

    const result = blockedDomainCheck();

    expect(result).toBe(true);
  });

  it('does not block hosts with execution.metamask.com as a prefix', () => {
    setLocation('execution.metamask.com.evil.tld');

    const result = blockedDomainCheck();

    expect(result).toBe(false);
  });
});
