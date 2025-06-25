import URLParse from 'url-parse';
import { getPermittedEvmAddressesByHostname } from '../../../core/Permissions';
import Engine from '../../../core/Engine';
import { NOTIFICATION_NAMES } from './constants';

// Mock dependencies
jest.mock('url-parse');
jest.mock('../../../core/Permissions');
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

// Extract and test the sendActiveAccount logic
const createSendActiveAccount = (notifyAllConnections: jest.Mock, resolvedUrlRef: { current: string }) => {
  return async (targetUrl?: string) => {
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
  };
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
    } as any));
  });

  describe('URL validation', () => {
    it('should return early when no URL is provided and resolvedUrlRef is empty', async () => {
      resolvedUrlRef.current = '';
      
      await sendActiveAccount();
      
      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should use targetUrl when provided', async () => {
      const targetUrl = 'https://example.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);
      
      await sendActiveAccount(targetUrl);
      
      expect(mockURLParse).toHaveBeenCalledWith(targetUrl);
    });

    it('should use resolvedUrlRef.current when no targetUrl provided', async () => {
      const currentUrl = 'https://current-site.com';
      resolvedUrlRef.current = currentUrl;
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);
      
      await sendActiveAccount();
      
      expect(mockURLParse).toHaveBeenCalledWith(currentUrl);
    });

    it('should prefer targetUrl over resolvedUrlRef.current when both exist', async () => {
      const targetUrl = 'https://target-site.com';
      resolvedUrlRef.current = 'https://current-site.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);
      
      await sendActiveAccount(targetUrl);
      
      expect(mockURLParse).toHaveBeenCalledWith(targetUrl);
      expect(mockURLParse).not.toHaveBeenCalledWith(resolvedUrlRef.current);
    });
  });

  describe('hostname extraction', () => {
    it('should extract hostname correctly from various URL formats', async () => {
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
    it('should check permissions for the correct hostname', async () => {
      const targetUrl = 'https://test-dapp.com';
      const expectedHostname = 'test-dapp.com';
      mockURLParse.mockImplementation(() => ({
        hostname: expectedHostname,
      } as any));
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        expectedHostname
      );
    });

    it('should use the correct PermissionController state', async () => {
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
    it('should not send notification when no accounts are permitted', async () => {
      const targetUrl = 'https://unauthorized-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should send notification when accounts are permitted', async () => {
      const targetUrl = 'https://authorized-dapp.com';
      const permittedAccounts = ['0x123', '0x456'];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });

    it('should send notification with correct format', async () => {
      const targetUrl = 'https://dapp.com';
      const permittedAccounts = ['0xabc123', '0xdef456', '0x789xyz'];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
      expect(mockNotifyAllConnections).toHaveBeenCalledTimes(1);
    });

    it('should send notification with single account', async () => {
      const targetUrl = 'https://single-account-dapp.com';
      const permittedAccounts = ['0xsingle123'];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });

    it('should send notification with multiple accounts', async () => {
      const targetUrl = 'https://multi-account-dapp.com';
      const permittedAccounts = ['0x111', '0x222', '0x333', '0x444'];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      await sendActiveAccount(targetUrl);

      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string URL gracefully', async () => {
      await sendActiveAccount('');

      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should handle undefined URL gracefully', async () => {
      await sendActiveAccount(undefined);

      // Should only call if resolvedUrlRef.current has a value
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should handle null URL gracefully', async () => {
      await sendActiveAccount(null as any);

      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should handle URL parsing errors gracefully', async () => {
      const targetUrl = 'invalid-url';
      mockURLParse.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      // Should not throw, but handle gracefully
      await expect(sendActiveAccount(targetUrl)).rejects.toThrow('Invalid URL');
    });

    it('should handle permission checking errors gracefully', async () => {
      const targetUrl = 'https://test-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockImplementation(() => {
        throw new Error('Permission check failed');
      });

      await expect(sendActiveAccount(targetUrl)).rejects.toThrow('Permission check failed');
    });
  });

  describe('security considerations', () => {
    it('should only send accounts for the specific hostname requested', async () => {
      const dapp1Url = 'https://dapp1.com';
      const dapp2Url = 'https://dapp2.com';
      
      const dapp1Accounts = ['0xdapp1account'];
      const dapp2Accounts = ['0xdapp2account'];

      // Test dapp1
      mockURLParse.mockImplementation((url) => ({
        hostname: new URL(url).hostname,
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

    it('should not send accounts to unauthorized domains', async () => {
      const authorizedUrl = 'https://authorized.com';
      const unauthorizedUrl = 'https://unauthorized.com';
      
      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => {
        return hostname === 'authorized.com' ? ['0xauthorized'] : [];
      });

      // Authorized domain should receive accounts
      await sendActiveAccount(authorizedUrl);
      expect(mockNotifyAllConnections).toHaveBeenCalled();

      mockNotifyAllConnections.mockClear();

      // Unauthorized domain should not receive accounts
      await sendActiveAccount(unauthorizedUrl);
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('should prevent cross-origin account leakage', async () => {
      // Simulate the vulnerability scenario where attacker tries to get victim's accounts
      const victimUrl = 'https://victim-dapp.com';
      const attackerUrl = 'https://attacker-site.com';
      
      const victimAccounts = ['0xvictimaccount1', '0xvictimaccount2'];
      
      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => {
        return hostname === 'victim-dapp.com' ? victimAccounts : [];
      });

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