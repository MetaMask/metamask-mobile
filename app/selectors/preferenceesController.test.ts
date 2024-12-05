import { RootState } from '../reducers';
import {
  selectIpfsGateway,
  selectUseNftDetection,
  selectShowMultiRpcModal,
  selectUseTokenDetection,
  selectDisplayNftMedia,
  selectUseSafeChainsListValidation,
  selectTokenSortConfig,
  selectTokenNetworkFilter,
  selectIsMultiAccountBalancesEnabled,
  selectShowTestNetworks,
  selectShowIncomingTransactionNetworks,
  selectIsIpfsGatewayEnabled,
  selectIsSecurityAlertsEnabled,
  selectSmartTransactionsOptInStatus,
  selectUseTransactionSimulations,
  selectPrivacyMode,
  selectIsTokenNetworkFilterEqualCurrentNetwork,
} from './preferencesController';

describe('Preferences Selectors', () => {
  const mockPreferencesState = {
    ipfsGateway: 'https://ipfs.io',
    useNftDetection: true,
    showMultiRpcModal: false,
    useTokenDetection: true,
    displayNftMedia: false,
    useSafeChainsListValidation: true,
    tokenSortConfig: { sortBy: 'name' },
    tokenNetworkFilter: { '0x1': true },
    isMultiAccountBalancesEnabled: true,
    showTestNetworks: true,
    showIncomingTransactions: { '1': true },
    isIpfsGatewayEnabled: false,
    securityAlertsEnabled: true,
    smartTransactionsOptInStatus: 'enabled',
    useTransactionSimulations: true,
    privacyMode: false,
  };

  const mockRootState: RootState = {
    engine: {
      backgroundState: {
        PreferencesController: mockPreferencesState,
      },
    },
  } as unknown as RootState;

  describe('selectIpfsGateway', () => {
    it('returns the IPFS Gateway URL', () => {
      expect(selectIpfsGateway(mockRootState)).toBe('https://ipfs.io');
    });
  });

  describe('selectUseNftDetection', () => {
    it('returns the NFT detection flag', () => {
      expect(selectUseNftDetection(mockRootState)).toBe(true);
    });
  });

  describe('selectShowMultiRpcModal', () => {
    it('returns the multi-RPC modal visibility flag', () => {
      expect(selectShowMultiRpcModal(mockRootState)).toBe(false);
    });
  });

  describe('selectUseTokenDetection', () => {
    it('returns the token detection flag', () => {
      expect(selectUseTokenDetection(mockRootState)).toBe(true);
    });
  });

  describe('selectDisplayNftMedia', () => {
    it('returns the display NFT media flag', () => {
      expect(selectDisplayNftMedia(mockRootState)).toBe(false);
    });
  });

  describe('selectUseSafeChainsListValidation', () => {
    it('returns the safe chains list validation flag', () => {
      expect(selectUseSafeChainsListValidation(mockRootState)).toBe(true);
    });
  });

  describe('selectTokenSortConfig', () => {
    it('returns the token sort configuration', () => {
      expect(selectTokenSortConfig(mockRootState)).toStrictEqual({
        sortBy: 'name',
      });
    });
  });

  describe('selectTokenNetworkFilter', () => {
    it('returns the token network filter', () => {
      expect(selectTokenNetworkFilter(mockRootState)).toStrictEqual({
        '0x1': true,
      });
    });
  });

  describe('selectIsMultiAccountBalancesEnabled', () => {
    it('returns the multi-account balances enabled flag', () => {
      expect(selectIsMultiAccountBalancesEnabled(mockRootState)).toBe(true);
    });
  });

  describe('selectShowTestNetworks', () => {
    it('returns the show test networks flag', () => {
      expect(selectShowTestNetworks(mockRootState)).toBe(true);
    });
  });

  describe('selectShowIncomingTransactionNetworks', () => {
    it('returns the incoming transaction networks', () => {
      expect(
        selectShowIncomingTransactionNetworks(mockRootState),
      ).toStrictEqual({
        '1': true,
      });
    });
  });

  describe('selectIsIpfsGatewayEnabled', () => {
    it('returns the IPFS gateway enabled flag', () => {
      expect(selectIsIpfsGatewayEnabled(mockRootState)).toBe(false);
    });
  });

  describe('selectIsSecurityAlertsEnabled', () => {
    it('returns the security alerts enabled flag', () => {
      expect(selectIsSecurityAlertsEnabled(mockRootState)).toBe(true);
    });
  });

  describe('selectSmartTransactionsOptInStatus', () => {
    it('returns the smart transactions opt-in status', () => {
      expect(selectSmartTransactionsOptInStatus(mockRootState)).toBe('enabled');
    });
  });

  describe('selectUseTransactionSimulations', () => {
    it('returns the transaction simulations flag', () => {
      expect(selectUseTransactionSimulations(mockRootState)).toBe(true);
    });
  });

  describe('selectPrivacyMode', () => {
    it('returns the privacy mode flag', () => {
      expect(selectPrivacyMode(mockRootState)).toBe(false);
    });
  });

  describe('selectIsTokenNetworkFilterEqualCurrentNetwork', () => {
    it('returns true when tokenNetworkFilter matches the current network chainId', () => {
      const result =
        selectIsTokenNetworkFilterEqualCurrentNetwork(mockRootState);

      expect(result).toBe(true);
    });

    it('returns false when tokenNetworkFilter does not match the current network chainId', () => {
      const result = selectIsTokenNetworkFilterEqualCurrentNetwork({
        engine: {
          backgroundState: {
            PreferencesController: {
              ...mockPreferencesState,
              tokenNetworkFilter: {},
            },
          },
        },
      } as unknown as RootState);

      expect(result).toBe(false);
    });
  });
});
