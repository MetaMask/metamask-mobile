import URLParse from 'url-parse';
import { getPermittedEvmAddressesByHostname } from '../../../core/Permissions';
import Engine from '../../../core/Engine';
import { NOTIFICATION_NAMES } from './constants';
import Logger from '../../../util/Logger';

type EthereumAddress = `0x${string}`;
type MockURLParse = URLParse<Record<string, string>>;

// Mock dependencies
jest.mock('url-parse');
jest.mock('../../../core/Permissions');
jest.mock('../../../util/Logger');
jest.mock('../../../core/Engine', () => ({
  context: {
    PermissionController: {
      state: {
        subjects: {}
      }
    }
  }
}));

const mockNotifyAllConnections = jest.fn();
const mockGetPermittedEvmAddressesByHostname = getPermittedEvmAddressesByHostname as jest.MockedFunction<typeof getPermittedEvmAddressesByHostname>;
const mockURLParse = URLParse as jest.MockedFunction<typeof URLParse>;
const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;

// Extract and test the sendActiveAccount logic
const createSendActiveAccount = (notifyAllConnections: jest.Mock, resolvedUrlRef: { current: string }) => async (targetUrl?: string) => {
    try {
      // Use the target URL if provided, otherwise use current resolved URL
      const urlToCheck = targetUrl || resolvedUrlRef.current;
      if (!urlToCheck) return;

      const hostname = new URLParse(urlToCheck).hostname;
      const permissionsControllerState = Engine.context.PermissionController.state;

      // Get permitted accounts specifically for the target hostname
      const permittedAccountsForTarget = getPermittedEvmAddressesByHostname(
        permissionsControllerState,
        hostname,
      );

      // Only send account information if the target URL has explicit permissions
      if (permittedAccountsForTarget.length > 0) {
        notifyAllConnections({
          method: NOTIFICATION_NAMES.accountsChanged,
          params: permittedAccountsForTarget,
        });
      }
    } catch (err) {
      Logger.log(err as Error, 'Error in sendActiveAccount');
      return;
    }
  };

describe('sendActiveAccount function', () => {
  let sendActiveAccount: (targetUrl?: string) => Promise<void>;
  let resolvedUrlRef: { current: string };

  beforeEach(() => {
    jest.clearAllMocks();
    resolvedUrlRef = { current: '' };
    sendActiveAccount = createSendActiveAccount(mockNotifyAllConnections, resolvedUrlRef);

    // Setup default URL parsing mock
    mockURLParse.mockImplementation((url: string) => ({
      hostname: new URL(url).hostname,
    }) as URLParse<Record<string, string>>);
  });

  describe('URL validation', () => {
    it('returns early when no URL is provided and resolvedUrlRef is empty', async () => {
      resolvedUrlRef.current = '';

      await sendActiveAccount();

      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('use targetUrl when provided', async () => {
      const targetUrl = 'https://example.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockURLParse).toHaveBeenCalledWith(targetUrl);
    });

    it('use resolvedUrlRef.current when no targetUrl provided', async () => {
      const currentUrl = 'https://current-site.com';
      resolvedUrlRef.current = currentUrl;
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount();

      expect(mockURLParse).toHaveBeenCalledWith(currentUrl);
    });

    it('use targetUrl over resolvedUrlRef.current when both exist', async () => {
      const targetUrl = 'https://target-site.com';
      resolvedUrlRef.current = 'https://current-site.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockURLParse).toHaveBeenCalledWith(targetUrl);
      expect(mockURLParse).not.toHaveBeenCalledWith(resolvedUrlRef.current);
    });
  });

  describe('hostname extraction', () => {
    it('extract hostname correctly from various URL formats', async () => {
      const testCases = [
        {
          url: 'https://example.com',
          expectedHostname: 'example.com'
        },
        {
          url: 'https://subdomain.example.com:8080/path?query=1',
          expectedHostname: 'subdomain.example.com'
        },
        {
          url: 'http://localhost:3000',
          expectedHostname: 'localhost'
        },
        {
          url: 'https://dapp.uniswap.org/swap',
          expectedHostname: 'dapp.uniswap.org'
        }
      ];

      for (const { url, expectedHostname } of testCases) {
        mockURLParse.mockImplementation(() => ({
          hostname: expectedHostname,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any));
        mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

        await sendActiveAccount(url);

        expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
          Engine.context.PermissionController.state,
          expectedHostname
        );

        mockURLParse.mockClear();
        mockGetPermittedEvmAddressesByHostname.mockClear();
      }
    });
  });

  describe('permission checking', () => {
    it('check permissions for the correct hostname', async () => {
      const targetUrl = 'https://test-dapp.com';
      const expectedHostname = 'test-dapp.com';
      mockURLParse.mockImplementation(() => ({
        hostname: expectedHostname,
      }) as MockURLParse);
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        expectedHostname
      );
    });

    it('use the correct PermissionController state', async () => {
      const targetUrl = 'https://test-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        expect.any(String)
      );
    });
  });

  describe('notification behavior', () => {
    it('do not send notification when no accounts are permitted', async () => {
      const targetUrl = 'https://unauthorized-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('send notification when accounts are permitted', async () => {
      const targetUrl = 'https://authorized-dapp.com';
      const permittedAccounts = ['0x1234567890123456789012345678901234567890', '0x0987654321098765432109876543210987654321'] as `0x${string}`[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });

    it('send notification with correct format', async () => {
      const targetUrl = 'https://dapp.com';
      const permittedAccounts = ['0xabc1234567890123456789012345678901234567', '0xdef4567890123456789012345678901234567890', '0x7890123456789012345678901234567890123456'] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
      expect(mockNotifyAllConnections).toHaveBeenCalledTimes(1);
    });

    it('send notification with single account', async () => {
      const targetUrl = 'https://single-account-dapp.com';
      const permittedAccounts = ['0x1111111111111111111111111111111111111111'] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });

    it('send notification with multiple accounts', async () => {
      const targetUrl = 'https://multi-account-dapp.com';
      const permittedAccounts = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', '0x4444444444444444444444444444444444444444'] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });
  });

  describe('edge cases', () => {
    it('handle empty string URL gracefully', async () => {
      await sendActiveAccount('');

      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('handle undefined URL gracefully', async () => {
      await sendActiveAccount(undefined);

      // Should only call if resolvedUrlRef.current has a value
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('handle null URL gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sendActiveAccount(null as any);

      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('handle URL parsing errors gracefully', async () => {
      const targetUrl = 'invalid-url';
      const error = new Error('Invalid URL');
      mockURLParse.mockImplementation(() => {
        throw error;
      });

      // Should not throw, but handle gracefully
      await expect(sendActiveAccount(targetUrl)).resolves.toBeUndefined();
      
      // Should log the error
      expect(mockLoggerLog).toHaveBeenCalledWith(error, 'Error in sendActiveAccount');
      
      // Should not proceed to call other functions
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('handle permission checking errors gracefully', async () => {
      const targetUrl = 'https://test-dapp.com';
      const error = new Error('Permission check failed');
      mockGetPermittedEvmAddressesByHostname.mockImplementation(() => {
        throw error;
      });

      // Should not throw, but handle gracefully
      await expect(sendActiveAccount(targetUrl)).resolves.toBeUndefined();
      
      // Should log the error
      expect(mockLoggerLog).toHaveBeenCalledWith(error, 'Error in sendActiveAccount');
      
      // Should not proceed to notify connections
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });
  });

  describe('security considerations', () => {
    it('only send accounts for the specific hostname requested', async () => {
      const dapp1Url = 'https://dapp1.com';
      const dapp2Url = 'https://dapp2.com';

      const dapp1Accounts = ['0x1111111111111111111111111111111111111111'] as EthereumAddress[];
      const dapp2Accounts = ['0x2222222222222222222222222222222222222222'] as EthereumAddress[];

      // Test dapp1
      mockURLParse.mockImplementation((url) => ({
        hostname: new URL(url).hostname,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));
      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => {
        if (hostname === 'dapp1.com') return dapp1Accounts;
        if (hostname === 'dapp2.com') return dapp2Accounts;
        return [];
      });

      await sendActiveAccount(dapp1Url);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: dapp1Accounts,
      });

      mockNotifyAllConnections.mockClear();

      // Test dapp2
      await sendActiveAccount(dapp2Url);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: dapp2Accounts,
      });
    });

    it('not send accounts to unauthorized domains', async () => {
      const authorizedUrl = 'https://authorized.com';
      const unauthorizedUrl = 'https://unauthorized.com';

      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => hostname === 'authorized.com' ? ['0x1234567890123456789012345678901234567890'] as EthereumAddress[] : []);

      // Authorized domain should receive accounts
      await sendActiveAccount(authorizedUrl);
      expect(mockNotifyAllConnections).toHaveBeenCalled();

      mockNotifyAllConnections.mockClear();

      // Unauthorized domain should not receive accounts
      await sendActiveAccount(unauthorizedUrl);
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('prevent cross-origin account leakage', async () => {
      // Simulate the vulnerability scenario where attacker tries to get victim's accounts
      const victimUrl = 'https://victim-dapp.com';
      const attackerUrl = 'https://attacker-site.com';

      const victimAccounts = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'] as EthereumAddress[];

      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => hostname === 'victim-dapp.com' ? victimAccounts : []);

      // Attacker site should not receive victim's accounts
      await sendActiveAccount(attackerUrl);
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();

      // Only victim site should receive its accounts
      await sendActiveAccount(victimUrl);
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: victimAccounts,
      });
    });
  });
});
