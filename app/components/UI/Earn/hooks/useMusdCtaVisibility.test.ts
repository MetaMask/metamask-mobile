import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdCtaVisibility } from './useMusdCtaVisibility';
import { useMusdBalance } from './useMusdBalance';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNetworksByCustomNamespace } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../constants/musd';
import { createMockToken } from '../../Stake/testUtils';
import {
  selectIsMusdConversionAssetOverviewEnabledFlag,
  selectIsMusdConversionTokenListItemCtaEnabledFlag,
  selectIsMusdGetBuyCtaEnabledFlag,
  selectMusdConversionCTATokens,
} from '../selectors/featureFlags';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { selectMusdConversionAssetDetailCtasSeen } from '../../../../reducers/user/selectors';
import type { WildcardTokenList } from '../utils/wildcardTokenList';
import type { TokenI } from '../../Tokens/types';
import type { AssetType } from '../../../Views/confirmations/types/token';

jest.mock('./useMusdBalance');
jest.mock('./useMusdConversionTokens');
jest.mock('./useMusdConversionEligibility');
jest.mock('../../../hooks/useCurrentNetworkInfo');
jest.mock('../../../hooks/useNetworksByNamespace/useNetworksByNamespace');
jest.mock('../../Ramp/hooks/useRampTokens');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../selectors/featureFlags');
jest.mock('../../../../selectors/assets/balances');
jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(),
}));

import { isNonEvmChainId } from '../../../../core/Multichain/utils';
const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

import { useSelector } from 'react-redux';

const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockUseNetworksByCustomNamespace =
  useNetworksByCustomNamespace as jest.MockedFunction<
    typeof useNetworksByCustomNamespace
  >;
const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;
const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;
const mockUseMusdConversionEligibility =
  useMusdConversionEligibility as jest.MockedFunction<
    typeof useMusdConversionEligibility
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
describe('useMusdCtaVisibility', () => {
  const defaultNetworkInfo = {
    enabledNetworks: [],
    getNetworkInfo: jest.fn(),
    getNetworkInfoByChainId: jest.fn(),
    isDisabled: false,
    hasEnabledNetworks: false,
  };

  const defaultNetworksByNamespace = {
    networks: [],
    selectedNetworks: [],
    areAllNetworksSelected: false,
    areAnyNetworksSelected: false,
    networkCount: 0,
    selectedCount: 0,
    totalEnabledNetworksCount: 0,
  };

  const createMusdRampToken = (
    chainId: Hex,
    tokenSupported = true,
  ): RampsToken => {
    const assetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId].toLowerCase();
    // Extract CAIP-2 chainId from CAIP-19 assetId (e.g., 'eip155:1' from 'eip155:1/erc20:0x...')
    const caipChainId = assetId.split('/')[0] as `${string}:${string}`;
    return {
      assetId: assetId as `${string}:${string}/${string}:${string}`,
      symbol: 'MUSD',
      chainId: caipChainId,
      tokenSupported,
      name: 'MetaMask USD',
      iconUrl: '',
      decimals: 6,
    };
  };

  const defaultRampTokens = {
    topTokens: null,
    allTokens: [
      createMusdRampToken(CHAIN_IDS.MAINNET),
      createMusdRampToken(CHAIN_IDS.LINEA_MAINNET),
    ],
    isLoading: false,
    error: null,
  };

  let mockIsMusdCtaEnabled = true;
  let mockIsMusdConversionTokenListItemCtaEnabled = false;
  let mockIsMusdConversionAssetOverviewEnabled = false;
  let mockMusdConversionCtaTokens: WildcardTokenList = {};
  let mockAccountBalance: {
    walletId: string;
    groupId: string;
    totalBalanceInUserCurrency: number;
    userCurrency: string;
  } | null = {
    walletId: 'test-wallet',
    groupId: 'test-group',
    totalBalanceInUserCurrency: 100,
    userCurrency: 'USD',
  };
  let mockMusdConversionAssetDetailCtasSeen: Record<string, boolean> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMusdCtaEnabled = true;
    mockIsMusdConversionTokenListItemCtaEnabled = false;
    mockIsMusdConversionAssetOverviewEnabled = false;
    mockMusdConversionCtaTokens = {};
    // Default to non-empty wallet
    mockAccountBalance = {
      walletId: 'test-wallet',
      groupId: 'test-group',
      totalBalanceInUserCurrency: 100,
      userCurrency: 'USD',
    };
    mockMusdConversionAssetDetailCtasSeen = {};

    mockIsNonEvmChainId.mockReturnValue(false);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMusdGetBuyCtaEnabledFlag) {
        return mockIsMusdCtaEnabled;
      }
      if (selector === selectIsMusdConversionTokenListItemCtaEnabledFlag) {
        return mockIsMusdConversionTokenListItemCtaEnabled;
      }
      if (selector === selectIsMusdConversionAssetOverviewEnabledFlag) {
        return mockIsMusdConversionAssetOverviewEnabled;
      }
      if (selector === selectMusdConversionCTATokens) {
        return mockMusdConversionCtaTokens;
      }
      if (selector === selectAccountGroupBalanceForEmptyState) {
        return mockAccountBalance;
      }
      if (selector === selectMusdConversionAssetDetailCtasSeen) {
        return mockMusdConversionAssetDetailCtasSeen;
      }
      return undefined;
    });
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      balancesByChain: {},
      hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
    });
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    mockUseNetworksByCustomNamespace.mockReturnValue(
      defaultNetworksByNamespace,
    );
    mockUseRampTokens.mockReturnValue(defaultRampTokens);
    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [],
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
      getMusdOutputChainId: jest.fn(),
    });
    mockUseMusdConversionEligibility.mockReturnValue({
      isEligible: true,
      isLoading: false,
      geolocation: 'US',
      blockedCountries: [],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with shouldShowBuyGetMusdCta, shouldShowTokenListItemCta, and shouldShowAssetOverviewCta functions', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current).toHaveProperty('shouldShowBuyGetMusdCta');
      expect(result.current).toHaveProperty('shouldShowTokenListItemCta');
      expect(result.current).toHaveProperty('shouldShowAssetOverviewCta');
    });
  });

  describe('shouldShowBuyGetMusdCta', () => {
    describe('feature flag', () => {
      it('returns shouldShowCta false when feature flag is disabled', () => {
        mockIsMusdCtaEnabled = false;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta true when feature flag is enabled and conditions are met', () => {
        mockIsMusdCtaEnabled = true;
        // Set empty wallet to satisfy visibility condition
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 0,
          userCurrency: 'USD',
        };
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
      });

      it('returns shouldShowCta false when feature flag is disabled even on supported single chain', () => {
        mockIsMusdCtaEnabled = false;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });
    });

    describe('all networks selected (popular networks)', () => {
      beforeEach(() => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
            { chainId: CHAIN_IDS.BSC, enabled: true },
          ],
        });
      });

      it('returns shouldShowCta true when user has no MUSD balance and MUSD is buyable', () => {
        // Set empty wallet to satisfy visibility condition
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 0,
          userCurrency: 'USD',
        };
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when user has MUSD balance', () => {
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when MUSD is not buyable on any chain', () => {
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: [],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
      });

      it('returns showNetworkIcon false for all networks', () => {
        const { result } = renderHook(() => useMusdCtaVisibility());
        const { showNetworkIcon } = result.current.shouldShowBuyGetMusdCta();

        expect(showNetworkIcon).toBe(false);
      });
    });

    describe('single supported network selected', () => {
      describe('mainnet selected', () => {
        beforeEach(() => {
          mockUseNetworksByCustomNamespace.mockReturnValue({
            ...defaultNetworksByNamespace,
            areAllNetworksSelected: false,
          });
          mockUseCurrentNetworkInfo.mockReturnValue({
            ...defaultNetworkInfo,
            enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
          });
        });

        it('returns shouldShowCta true when user has no MUSD on mainnet', () => {
          // Set empty wallet to satisfy visibility condition
          mockAccountBalance = {
            walletId: 'test-wallet',
            groupId: 'test-group',
            totalBalanceInUserCurrency: 0,
            userCurrency: 'USD',
          };
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: false,
            balancesByChain: {},
            hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon, selectedChainId } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(true);
          expect(showNetworkIcon).toBe(true);
          expect(selectedChainId).toBe(CHAIN_IDS.MAINNET);
        });

        it('returns shouldShowCta false when user has MUSD on mainnet', () => {
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: true,
            balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
            hasMusdBalanceOnChain: jest
              .fn()
              .mockImplementation(
                (chainId: Hex) => chainId === CHAIN_IDS.MAINNET,
              ),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
        });

        it('returns shouldShowCta true when user has MUSD on different chain but not mainnet', () => {
          // Set empty wallet to satisfy visibility condition
          mockAccountBalance = {
            walletId: 'test-wallet',
            groupId: 'test-group',
            totalBalanceInUserCurrency: 0,
            userCurrency: 'USD',
          };
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: true,
            balancesByChain: { [CHAIN_IDS.LINEA_MAINNET]: '0x1234' },
            hasMusdBalanceOnChain: jest
              .fn()
              .mockImplementation(
                (chainId: Hex) => chainId === CHAIN_IDS.LINEA_MAINNET,
              ),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(true);
          expect(showNetworkIcon).toBe(true);
        });

        it('returns shouldShowCta false when MUSD not buyable in region for mainnet', () => {
          mockUseRampTokens.mockReturnValue({
            ...defaultRampTokens,
            allTokens: [
              createMusdRampToken(CHAIN_IDS.MAINNET, false), // tokenSupported = false
              createMusdRampToken(CHAIN_IDS.LINEA_MAINNET),
            ],
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon, selectedChainId } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
          expect(showNetworkIcon).toBe(false);
          expect(selectedChainId).toBeNull();
        });

        it('returns shouldShowCta false when MUSD not buyable anywhere', () => {
          mockUseRampTokens.mockReturnValue({
            ...defaultRampTokens,
            allTokens: [
              createMusdRampToken(CHAIN_IDS.MAINNET, false),
              createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, false),
            ],
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
        });
      });

      describe('linea selected', () => {
        beforeEach(() => {
          mockUseNetworksByCustomNamespace.mockReturnValue({
            ...defaultNetworksByNamespace,
            areAllNetworksSelected: false,
          });
          mockUseCurrentNetworkInfo.mockReturnValue({
            ...defaultNetworkInfo,
            enabledNetworks: [
              { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
            ],
          });
        });

        it('returns shouldShowCta true with network icon when no MUSD on Linea', () => {
          // Set empty wallet to satisfy visibility condition
          mockAccountBalance = {
            walletId: 'test-wallet',
            groupId: 'test-group',
            totalBalanceInUserCurrency: 0,
            userCurrency: 'USD',
          };
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: false,
            balancesByChain: {},
            hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon, selectedChainId } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(true);
          expect(showNetworkIcon).toBe(true);
          expect(selectedChainId).toBe(CHAIN_IDS.LINEA_MAINNET);
        });

        it('returns shouldShowCta false when MUSD not buyable in region for Linea', () => {
          mockUseRampTokens.mockReturnValue({
            ...defaultRampTokens,
            allTokens: [
              createMusdRampToken(CHAIN_IDS.MAINNET),
              createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, false), // tokenSupported = false
            ],
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon, selectedChainId } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
          expect(showNetworkIcon).toBe(false);
          expect(selectedChainId).toBeNull();
        });
      });

      describe('BSC selected', () => {
        beforeEach(() => {
          mockUseNetworksByCustomNamespace.mockReturnValue({
            ...defaultNetworksByNamespace,
            areAllNetworksSelected: false,
          });
          mockUseCurrentNetworkInfo.mockReturnValue({
            ...defaultNetworkInfo,
            enabledNetworks: [{ chainId: CHAIN_IDS.BSC, enabled: true }],
          });
        });

        it('returns shouldShowCta false when BSC selected', () => {
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: false,
            balancesByChain: {},
            hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta, showNetworkIcon, selectedChainId } =
            result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
          expect(showNetworkIcon).toBe(false);
          expect(selectedChainId).toBeNull();
        });

        it('returns shouldShowCta false when user has MUSD balance', () => {
          mockUseMusdBalance.mockReturnValue({
            hasMusdBalanceOnAnyChain: true,
            balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
            hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
          });

          const { result } = renderHook(() => useMusdCtaVisibility());
          const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

          expect(shouldShowCta).toBe(false);
        });
      });
    });

    describe('unsupported network selected', () => {
      it('returns shouldShowCta false for Polygon', () => {
        const polygonChainId = '0x89' as Hex;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: polygonChainId, enabled: true }],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false for Arbitrum', () => {
        const arbitrumChainId = '0xa4b1' as Hex;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: arbitrumChainId, enabled: true }],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
      });

      it('returns shouldShowCta false for Optimism', () => {
        const optimismChainId = '0xa' as Hex;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: optimismChainId, enabled: true }],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
      });

      it('returns shouldShowCta false for unsupported network when user has MUSD balance', () => {
        const polygonChainId = '0x89' as Hex;
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: polygonChainId, enabled: true }],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
      });
    });

    describe('multiple networks selected (not all)', () => {
      it('returns shouldShowCta true without network icon when multiple networks selected and no MUSD balance', () => {
        // Set empty wallet to satisfy visibility condition
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 0,
          userCurrency: 'USD',
        };
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when multiple networks selected and user has MUSD balance', () => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
      });
    });

    describe('geo restriction scenarios', () => {
      it('returns shouldShowCta false when allTokens is null (loading)', () => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: null,
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
      });

      it('returns shouldShowCta true when MUSD buyable on at least one chain in all networks view', () => {
        // Set empty wallet to satisfy visibility condition
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 0,
          userCurrency: 'USD',
        };
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: [
            createMusdRampToken(CHAIN_IDS.MAINNET, false), // not buyable
            createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, true), // buyable
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
      });
    });

    describe('geo blocking', () => {
      it('returns shouldShowCta false when user is geo-blocked in all networks view', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: false,
          isLoading: false,
          geolocation: 'GB',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when user is geo-blocked on single supported chain', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: false,
          isLoading: false,
          geolocation: 'GB',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('returns shouldShowCta true when user is not geo-blocked', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: true,
          isLoading: false,
          geolocation: 'US',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: false,
          balancesByChain: {},
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
        });
        // Provide tokens with chainId so canConvert is true
        mockUseMusdConversionTokens.mockReturnValue({
          tokens: [
            createMockToken({
              name: 'USDC',
              symbol: 'USDC',
              chainId: CHAIN_IDS.MAINNET,
            }) as TokenI,
          ],
          filterAllowedTokens: jest.fn(),
          isConversionToken: jest.fn().mockReturnValue(true),
          isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
          getMusdOutputChainId: jest.fn().mockReturnValue(CHAIN_IDS.MAINNET),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta } = result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('returns shouldShowCta false with empty enabledNetworks', () => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, showNetworkIcon, selectedChainId } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(showNetworkIcon).toBe(false);
        expect(selectedChainId).toBeNull();
      });

      it('handles undefined values gracefully', () => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [],
        });

        expect(() => renderHook(() => useMusdCtaVisibility())).not.toThrow();
      });
    });

    describe('empty wallet and canConvert logic', () => {
      const mockConversionToken: AssetType = {
        chainId: CHAIN_IDS.MAINNET,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        balance: '1000000',
        balanceFiat: '1.00',
        aggregators: [],
        image: '',
        logo: '',
        isETH: false,
      };

      beforeEach(() => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.MAINNET, enabled: true },
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
      });

      it('returns shouldShowCta true and isEmptyWallet true when wallet is empty', () => {
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 0,
          userCurrency: 'USD',
        };

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, isEmptyWallet } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
        expect(isEmptyWallet).toBe(true);
      });

      it('returns shouldShowCta true and isEmptyWallet false when wallet has convertible tokens', () => {
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 100,
          userCurrency: 'USD',
        };
        mockUseMusdConversionTokens.mockReturnValue({
          tokens: [mockConversionToken],
          filterAllowedTokens: jest.fn(),
          isConversionToken: jest.fn(),
          isMusdSupportedOnChain: jest.fn(),
          getMusdOutputChainId: jest.fn(),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, isEmptyWallet } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(true);
        expect(isEmptyWallet).toBe(false);
      });

      it('returns shouldShowCta false when wallet has tokens but none are convertible', () => {
        mockAccountBalance = {
          walletId: 'test-wallet',
          groupId: 'test-group',
          totalBalanceInUserCurrency: 100,
          userCurrency: 'USD',
        };
        mockUseMusdConversionTokens.mockReturnValue({
          tokens: [],
          filterAllowedTokens: jest.fn(),
          isConversionToken: jest.fn(),
          isMusdSupportedOnChain: jest.fn(),
          getMusdOutputChainId: jest.fn(),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { shouldShowCta, isEmptyWallet } =
          result.current.shouldShowBuyGetMusdCta();

        expect(shouldShowCta).toBe(false);
        expect(isEmptyWallet).toBe(false);
      });

      it('returns isEmptyWallet false when accountBalance is null', () => {
        mockAccountBalance = null;

        const { result } = renderHook(() => useMusdCtaVisibility());
        const { isEmptyWallet } = result.current.shouldShowBuyGetMusdCta();

        expect(isEmptyWallet).toBe(false);
      });

      it('returns isEmptyWallet in the result object', () => {
        const { result } = renderHook(() => useMusdCtaVisibility());
        const ctaResult = result.current.shouldShowBuyGetMusdCta();

        expect(ctaResult).toHaveProperty('isEmptyWallet');
        expect(typeof ctaResult.isEmptyWallet).toBe('boolean');
      });
    });
  });

  describe('shouldShowTokenListItemCta', () => {
    const conversionToken: AssetType = createMockToken({
      chainId: CHAIN_IDS.MAINNET,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      balance: '0',
      balanceFiat: '0',
    });

    const listItemToken: TokenI = {
      ...conversionToken,
      // checksum-casing to validate case-insensitive matching
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    beforeEach(() => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [conversionToken],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        getMusdOutputChainId: jest.fn(),
      });

      mockMusdConversionCtaTokens = { [CHAIN_IDS.MAINNET]: ['USDC'] };
      mockIsMusdConversionTokenListItemCtaEnabled = true;
    });

    it('returns false when token list item CTA flag is disabled', () => {
      mockIsMusdConversionTokenListItemCtaEnabled = false;

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(false);
    });

    it('returns false when token chainId is undefined', () => {
      const tokenWithoutChainId: TokenI = {
        ...listItemToken,
        chainId: undefined,
      };

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(tokenWithoutChainId);

      expect(isVisible).toBe(false);
    });

    it('returns false when token is on a non-EVM chain like Tron', () => {
      const tronChainId = 'tron:728126428';
      const tronToken: TokenI = {
        ...listItemToken,
        chainId: tronChainId,
      };
      mockIsNonEvmChainId.mockImplementation(
        (chainId) => chainId === tronChainId,
      );
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible = result.current.shouldShowTokenListItemCta(tronToken);

      expect(isVisible).toBe(false);
      expect(mockIsNonEvmChainId).toHaveBeenCalledWith(tronChainId);
    });

    it('returns false for non-EVM chain even when all conditions are met', () => {
      const tronChainId = 'tron:728126428';
      const tronToken: TokenI = {
        ...listItemToken,
        chainId: tronChainId,
      };
      mockIsNonEvmChainId.mockImplementation(
        (chainId) => chainId === tronChainId,
      );
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible = result.current.shouldShowTokenListItemCta(tronToken);

      expect(isVisible).toBe(false);
    });

    it('returns true when all networks selected, user has mUSD on any chain, and token is configured for CTA', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(true);
    });

    it('returns false when all networks selected and user has no mUSD on any chain', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: false,
        balancesByChain: {},
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(false),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(false);
    });

    it('returns true when single network selected, user has mUSD on selected chain, and token is configured for CTA', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest
          .fn()
          .mockImplementation((chainId: Hex) => chainId === CHAIN_IDS.MAINNET),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(true);
    });

    it('returns false when token is not configured for CTA', () => {
      mockMusdConversionCtaTokens = { [CHAIN_IDS.MAINNET]: ['DAI'] };
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(false);
    });

    it('returns true even when asset detail CTA was dismissed (dismissal only affects asset overview)', () => {
      mockMusdConversionAssetDetailCtasSeen = {
        '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
      };
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowTokenListItemCta(listItemToken);

      expect(isVisible).toBe(true);
    });

    describe('geo blocking', () => {
      it('returns false when user is geo-blocked', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: false,
          isLoading: false,
          geolocation: 'GB',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        const isVisible =
          result.current.shouldShowTokenListItemCta(listItemToken);

        expect(isVisible).toBe(false);
      });

      it('returns false when user is geo-blocked even with mUSD balance on single chain', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: false,
          isLoading: false,
          geolocation: 'GB',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest
            .fn()
            .mockImplementation(
              (chainId: Hex) => chainId === CHAIN_IDS.MAINNET,
            ),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        const isVisible =
          result.current.shouldShowTokenListItemCta(listItemToken);

        expect(isVisible).toBe(false);
      });

      it('returns true when user is not geo-blocked and conditions are met', () => {
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: true,
          isLoading: false,
          geolocation: 'US',
          blockedCountries: ['GB'],
        });
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: true,
        });
        mockUseMusdBalance.mockReturnValue({
          hasMusdBalanceOnAnyChain: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
          hasMusdBalanceOnChain: jest.fn().mockReturnValue(true),
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        const isVisible =
          result.current.shouldShowTokenListItemCta(listItemToken);

        expect(isVisible).toBe(true);
      });
    });
  });

  describe('shouldShowAssetOverviewCta', () => {
    const conversionToken: AssetType = createMockToken({
      chainId: CHAIN_IDS.MAINNET,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      balance: '0',
      balanceFiat: '0',
    });

    const assetOverviewToken: TokenI = {
      ...conversionToken,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    beforeEach(() => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [conversionToken],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        getMusdOutputChainId: jest.fn(),
      });
      mockMusdConversionCtaTokens = { [CHAIN_IDS.MAINNET]: ['USDC'] };
    });

    it('returns false when asset overview CTA flag is disabled', () => {
      mockIsMusdConversionAssetOverviewEnabled = false;

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowAssetOverviewCta(assetOverviewToken);

      expect(isVisible).toBe(false);
    });

    it('returns false when asset is undefined', () => {
      mockIsMusdConversionAssetOverviewEnabled = true;

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible = result.current.shouldShowAssetOverviewCta(undefined);

      expect(isVisible).toBe(false);
    });

    it('returns true when flag is enabled and token is configured for CTA', () => {
      mockIsMusdConversionAssetOverviewEnabled = true;

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowAssetOverviewCta(assetOverviewToken);

      expect(isVisible).toBe(true);
    });

    it('returns false when token is not configured for CTA', () => {
      mockIsMusdConversionAssetOverviewEnabled = true;
      mockMusdConversionCtaTokens = { [CHAIN_IDS.MAINNET]: ['DAI'] };

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowAssetOverviewCta(assetOverviewToken);

      expect(isVisible).toBe(false);
    });

    it('returns false when token is dismissed', () => {
      mockIsMusdConversionAssetOverviewEnabled = true;
      mockMusdConversionAssetDetailCtasSeen = {
        '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
      };

      const { result } = renderHook(() => useMusdCtaVisibility());

      const isVisible =
        result.current.shouldShowAssetOverviewCta(assetOverviewToken);

      expect(isVisible).toBe(false);
    });

    describe('geo blocking', () => {
      it('returns false when user is geo-blocked', () => {
        mockIsMusdConversionAssetOverviewEnabled = true;
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: false,
          isLoading: false,
          geolocation: 'GB',
          blockedCountries: ['GB'],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        const isVisible =
          result.current.shouldShowAssetOverviewCta(assetOverviewToken);

        expect(isVisible).toBe(false);
      });

      it('returns true when user is not geo-blocked and token is configured for CTA', () => {
        mockIsMusdConversionAssetOverviewEnabled = true;
        mockUseMusdConversionEligibility.mockReturnValue({
          isEligible: true,
          isLoading: false,
          geolocation: 'US',
          blockedCountries: ['GB'],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        const isVisible =
          result.current.shouldShowAssetOverviewCta(assetOverviewToken);

        expect(isVisible).toBe(true);
      });
    });
  });
});
