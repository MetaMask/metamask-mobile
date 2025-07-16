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
const mockLoggerError = Logger.error as jest.MockedFunction<typeof Logger.error>;

// Extract and test the sendActiveAccount logic
const createSendActiveAccount = (notifyAllConnections: jest.Mock, resolvedUrlRef: { current: string }) => async (targetUrl?: string) => {
  try {
    // Use targetUrl if explicitly provided (even if empty), otherwise fall back to resolvedUrlRef.current
    const urlToCheck = targetUrl !== undefined ? targetUrl : resolvedUrlRef.current;
    
    if (!urlToCheck) {
      // If no URL to check, send empty accounts
      notifyAllConnections({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
      return;
    }
    
    // Get permitted accounts for the target URL
    const permissionsControllerState = Engine.context.PermissionController.state;
    const hostname = new URLParse(urlToCheck).hostname;
    const permittedAcc = getPermittedEvmAddressesByHostname(
      permissionsControllerState,
      hostname,
    );

    notifyAllConnections({
      method: NOTIFICATION_NAMES.accountsChanged,
      params: permittedAcc,
    });
  } catch (err) {
    Logger.error(err as Error, 'Error in sendActiveAccount');
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

  describe('URL parameter handling', () => {
    it('uses targetUrl when provided instead of resolvedUrlRef', async () => {
      // Arrange
      const targetUrl = 'https://example.com';
      const resolvedUrl = 'https://different-site.com';
      resolvedUrlRef.current = resolvedUrl;
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockURLParse).toHaveBeenCalledWith(targetUrl);
      expect(mockURLParse).not.toHaveBeenCalledWith(resolvedUrl);
    });

    it('falls back to resolvedUrlRef when no targetUrl provided', async () => {
      // Arrange
      const resolvedUrl = 'https://fallback-site.com';
      resolvedUrlRef.current = resolvedUrl;
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      // Act
      await sendActiveAccount();

      // Then
      expect(mockURLParse).toHaveBeenCalledWith(resolvedUrl);
    });

    it('sends empty accounts when no URL is available', async () => {
      // Arrange
      resolvedUrlRef.current = '';

      // Act
      await sendActiveAccount();

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
    });

    it('sends empty accounts when targetUrl is empty string', async () => {
      // Arrange
      resolvedUrlRef.current = 'https://some-site.com';

      // Act
      await sendActiveAccount('');

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
    });
  });

  describe('hostname extraction and permission checking', () => {
    it('extracts hostname correctly from various URL formats', async () => {
      // Arrange
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
        // Arrange
        mockURLParse.mockImplementation(() => ({
          hostname: expectedHostname,
        } as any));
        mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

        // Act
        await sendActiveAccount(url);

        // Then
        expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
          Engine.context.PermissionController.state,
          expectedHostname
        );

        // Reset for next iteration
        mockURLParse.mockClear();
        mockGetPermittedEvmAddressesByHostname.mockClear();
        mockNotifyAllConnections.mockClear();
      }
    });

    it('checks permissions for the correct hostname', async () => {
      // Arrange
      const targetUrl = 'https://test-dapp.com';
      const expectedHostname = 'test-dapp.com';
      mockURLParse.mockImplementation(() => ({
        hostname: expectedHostname,
      }) as MockURLParse);
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        expectedHostname
      );
    });

    it('uses the correct PermissionController state', async () => {
      // Arrange
      const targetUrl = 'https://test-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        expect.any(String)
      );
    });
  });

  describe('notification behavior', () => {
    it('sends notification with empty array when no accounts are permitted', async () => {
      // Arrange
      const targetUrl = 'https://unauthorized-dapp.com';
      mockGetPermittedEvmAddressesByHostname.mockReturnValue([]);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
    });

    it('sends notification with permitted accounts when accounts are available', async () => {
      // Arrange
      const targetUrl = 'https://authorized-dapp.com';
      const permittedAccounts = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321'
      ] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });

    it('sends notification with correct format for single account', async () => {
      // Arrange
      const targetUrl = 'https://single-account-dapp.com';
      const permittedAccounts = ['0x1111111111111111111111111111111111111111'] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
      expect(mockNotifyAllConnections).toHaveBeenCalledTimes(1);
    });

    it('sends notification with multiple accounts correctly', async () => {
      // Arrange
      const targetUrl = 'https://multi-account-dapp.com';
      const permittedAccounts = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444'
      ] as EthereumAddress[];
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(permittedAccounts);

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: permittedAccounts,
      });
    });
  });

  describe('security considerations', () => {
    it('sends accounts only for the specific hostname requested', async () => {
      // Arrange
      const dapp1Url = 'https://dapp1.com';
      const dapp2Url = 'https://dapp2.com';
      const dapp1Accounts = ['0x1111111111111111111111111111111111111111'] as EthereumAddress[];
      const dapp2Accounts = ['0x2222222222222222222222222222222222222222'] as EthereumAddress[];

      mockURLParse.mockImplementation((url) => ({
        hostname: new URL(url).hostname,
      } as any));
      
      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => {
        if (hostname === 'dapp1.com') return dapp1Accounts;
        if (hostname === 'dapp2.com') return dapp2Accounts;
        return [];
      });

      // Act - Test dapp1
      await sendActiveAccount(dapp1Url);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: dapp1Accounts,
      });

      mockNotifyAllConnections.mockClear();

      // Act - Test dapp2
      await sendActiveAccount(dapp2Url);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: dapp2Accounts,
      });
    });

    it('prevents cross-origin account leakage during navigation', async () => {
      // Arrange - Simulate navigation from authorized site to unauthorized site
      const authorizedUrl = 'https://authorized.com';
      const unauthorizedUrl = 'https://unauthorized.com';
      const authorizedAccounts = ['0x1234567890123456789012345678901234567890'] as EthereumAddress[];

      resolvedUrlRef.current = authorizedUrl; // Previous site
      
      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => 
        hostname === 'authorized.com' ? authorizedAccounts : []
      );

      // Act - Send accounts for the new site being navigated to
      await sendActiveAccount(unauthorizedUrl);

      // Then - Should send empty accounts for unauthorized site, not authorized site's accounts
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [], // Empty array for unauthorized site
      });
    });

    it('correctly handles targetUrl override during navigation vulnerability scenario', async () => {
      // Arrange - Simulate the exact vulnerability scenario
      const previousSiteUrl = 'https://victim-dapp.com';
      const newSiteUrl = 'https://attacker-site.com';
      const victimAccounts = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      ] as EthereumAddress[];

      // resolvedUrlRef still points to previous site (before onLoadEnd updates it)
      resolvedUrlRef.current = previousSiteUrl;

      mockGetPermittedEvmAddressesByHostname.mockImplementation((_, hostname) => 
        hostname === 'victim-dapp.com' ? victimAccounts : []
      );

      // Act - Call with targetUrl (new implementation)
      await sendActiveAccount(newSiteUrl);

      // Then - Should check permissions for the new site, not the previous one
      expect(mockGetPermittedEvmAddressesByHostname).toHaveBeenCalledWith(
        Engine.context.PermissionController.state,
        'attacker-site.com' // Should use new site's hostname
      );
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [], // Empty because attacker site has no permissions
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('handles null URL gracefully', async () => {
      // Act
      await sendActiveAccount(null as any);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
      expect(mockURLParse).not.toHaveBeenCalled();
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
    });

    it('handles undefined URL gracefully', async () => {
      // Arrange
      resolvedUrlRef.current = '';

      // Act
      await sendActiveAccount(undefined);

      // Then
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [],
      });
      expect(mockGetPermittedEvmAddressesByHostname).not.toHaveBeenCalled();
    });

    it('handles URL parsing errors gracefully', async () => {
      // Arrange
      const targetUrl = 'invalid-url';
      const error = new Error('Invalid URL');
      mockURLParse.mockImplementation(() => {
        throw error;
      });

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockLoggerError).toHaveBeenCalledWith(error, 'Error in sendActiveAccount');
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });

    it('handles permission checking errors gracefully', async () => {
      // Arrange
      const targetUrl = 'https://test-dapp.com';
      const error = new Error('Permission check failed');
      mockGetPermittedEvmAddressesByHostname.mockImplementation(() => {
        throw error;
      });

      // Act
      await sendActiveAccount(targetUrl);

      // Then
      expect(mockLoggerError).toHaveBeenCalledWith(error, 'Error in sendActiveAccount');
      expect(mockNotifyAllConnections).not.toHaveBeenCalled();
    });
  });

  describe('backwards compatibility', () => {
    it('maintains original behavior when called without parameters', async () => {
      // Arrange
      const resolvedUrl = 'https://current-site.com';
      const expectedAccounts = ['0x1234567890123456789012345678901234567890'] as EthereumAddress[];
      resolvedUrlRef.current = resolvedUrl;
      mockGetPermittedEvmAddressesByHostname.mockReturnValue(expectedAccounts);

      // Act
      await sendActiveAccount(); // Called without parameters like before

      // Then
      expect(mockURLParse).toHaveBeenCalledWith(resolvedUrl);
      expect(mockNotifyAllConnections).toHaveBeenCalledWith({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: expectedAccounts,
      });
    });
  });
});
