import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { ToastContext } from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import {
  selectCardDelegationSettings,
  selectCardHomeDataStatus,
  selectIsCardAuthenticated,
  selectIsCardVerified,
  selectIsCardholder,
  selectIsMoneyAccountCardLinkInProgress,
  selectIsMoneyAccountDelegatedForCard,
  selectIsCardResidencyBlocked,
  selectMoneyAccountVedaTokenConfig,
} from '../../../../selectors/cardController';
import {
  selectPendingMoneyAccountCardLink,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { selectIsMoneyAccountGeoEligible } from '../../Money/selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { resolveMoneyAccountCardToken } from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import Routes from '../../../../constants/navigation/Routes';
import { BAANX_MAX_LIMIT } from '../constants';
import { FundingStatus } from '../types';
import { useMoneyAccountCardLinkage } from './useMoneyAccountCardLinkage';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  CardEntryPoint,
  CardFlow,
  CardLinkingFailureReason,
} from '../util/metrics';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockLinkMoneyAccountCard = jest.fn();
const mockIsLinkageInProgress = jest.fn<boolean, []>();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        linkMoneyAccountCard: (...args: unknown[]) =>
          mockLinkMoneyAccountCard(...args),
        isLinkageInProgress: () => mockIsLinkageInProgress(),
      },
    },
  },
}));

jest.mock('./useCardDelegation', () => {
  class MockUserCancelledError extends Error {
    constructor(message = 'User cancelled') {
      super(message);
      this.name = 'UserCancelledError';
    }
  }
  return { UserCancelledError: MockUserCancelledError };
});

jest.mock(
  '../../../../core/Engine/controllers/card-controller/provider-types',
  () => {
    class MockCardLinkageInProgressError extends Error {
      constructor(
        message = 'A Money Account to Card linkage is already in progress',
      ) {
        super(message);
        this.name = 'CardLinkageInProgressError';
      }
    }
    return { CardLinkageInProgressError: MockCardLinkageInProgressError };
  },
);

jest.mock(
  '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken',
  () => ({
    resolveMoneyAccountCardToken: jest.fn(),
    hasMoneyAccountCardRequirements: ({
      isMoneyAccountEnabled,
      vaultConfig,
      moneyAccountAddress,
    }: {
      isMoneyAccountEnabled: boolean;
      vaultConfig: unknown;
      moneyAccountAddress?: string | null;
    }) => Boolean(isMoneyAccountEnabled && vaultConfig && moneyAccountAddress),
  }),
);

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockResolveMoneyAccountCardToken =
  resolveMoneyAccountCardToken as jest.Mock;
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn((_eventName?: unknown) => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const MONEY_ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890';

const MOCK_TOKEN = {
  address: '0xtoken',
  symbol: 'USDC',
  name: 'USDC',
  decimals: 6,
  caipChainId: 'eip155:11297108099' as `${string}:${string}`,
  fundingStatus: FundingStatus.NotEnabled,
  spendableBalance: '0',
  delegationContract: '0xdelegation',
};

type CardHomeDataStatusMock = 'idle' | 'loading' | 'success' | 'error';

const buildSelectors = (
  overrides: {
    primaryMoneyAccount?: { address: string } | undefined;
    vaultConfig?: { chainId?: string } | undefined;
    isMoneyAccountVisible?: boolean;
    isCardAuthenticated?: boolean;
    isCardVerified?: boolean;
    isCardholder?: boolean;
    delegationSettings?: unknown;
    isAlreadyDelegated?: boolean;
    pendingMoneyAccountCardLink?: CardEntryPoint | null;
    cardHomeDataStatus?: CardHomeDataStatusMock;
    isMonadSponsorshipEnabled?: boolean;
    moneyAccountCardLinkInProgress?: boolean;
    cardFeatureFlag?: unknown;
    vedaConfig?: unknown;
    isResidencyBlocked?: boolean;
  } = {},
) => ({
  primaryMoneyAccount: { address: MONEY_ACCOUNT_ADDRESS },
  vaultConfig: { chainId: '0x8f' },
  isMoneyAccountVisible: true,
  isCardAuthenticated: true,
  isCardVerified: true,
  isCardholder: false,
  delegationSettings: { ok: true },
  isAlreadyDelegated: false,
  pendingMoneyAccountCardLink: null,
  cardHomeDataStatus: 'success' as CardHomeDataStatusMock,
  isMonadSponsorshipEnabled: true,
  moneyAccountCardLinkInProgress: false,
  cardFeatureFlag: {
    chains: {
      'eip155:143': {
        enabled: true,
        tokens: [
          {
            address: '0xveda',
            symbol: 'veda',
            decimals: 6,
            enabled: true,
            name: 'Veda',
          },
        ],
      },
    },
  },
  vedaConfig: {
    caipChainId: 'eip155:143',
    address: '0xveda',
    decimals: 6,
    delegationContract: '0xdelegation',
  },
  isResidencyBlocked: false,
  ...overrides,
});

const applySelectorMocks = (state: ReturnType<typeof buildSelectors>) => {
  mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) => {
    if (selector === selectPrimaryMoneyAccount)
      return state.primaryMoneyAccount;
    if (selector === selectMoneyAccountVaultConfig) return state.vaultConfig;
    if (selector === selectMoneyEnableMoneyAccountFlag)
      return state.isMoneyAccountVisible;
    if (selector === selectIsMoneyAccountGeoEligible) return true;
    if (selector === selectIsCardAuthenticated)
      return state.isCardAuthenticated;
    if (selector === selectIsCardVerified) return state.isCardVerified;
    if (selector === selectIsCardholder) return state.isCardholder;
    if (selector === selectCardDelegationSettings)
      return state.delegationSettings;
    if (selector === selectCardHomeDataStatus) return state.cardHomeDataStatus;
    if (selector === selectIsMoneyAccountDelegatedForCard)
      return state.isAlreadyDelegated;
    if (selector === selectIsMoneyAccountCardLinkInProgress)
      return state.moneyAccountCardLinkInProgress;
    if (selector === selectPendingMoneyAccountCardLink)
      return state.pendingMoneyAccountCardLink;
    if (selector === getGasFeesSponsoredNetworkEnabled)
      return (_chainId: string) => state.isMonadSponsorshipEnabled;
    if (selector === selectCardFeatureFlag) return state.cardFeatureFlag;
    if (selector === selectMoneyAccountVedaTokenConfig) return state.vedaConfig;
    if (selector === selectIsCardResidencyBlocked)
      return state.isResidencyBlocked;
    return undefined;
  });
};

describe('useMoneyAccountCardLinkage', () => {
  let mockShowToast: jest.Mock;
  let mockToastRef: { current: { showToast: jest.Mock } };
  const expectedLinkCardSheetRoute = (
    entrypoint: CardEntryPoint | string = CardEntryPoint.MONEY_LINK_CARD_SHEET,
  ) => ({
    screen: Routes.MONEY.MODALS.LINK_CARD_SHEET,
    params: { entrypoint },
  });

  const renderLinkageHook = () =>
    renderHook(() => useMoneyAccountCardLinkage(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
          {children}
        </ToastContext.Provider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast = jest.fn();
    mockToastRef = { current: { showToast: mockShowToast } };

    mockResolveMoneyAccountCardToken.mockReturnValue(MOCK_TOKEN);
    applySelectorMocks(buildSelectors());
    // Default: no in-flight linkage. Singleflight-specific tests override
    // this within their own `it` blocks.
    mockIsLinkageInProgress.mockReturnValue(false);
  });

  describe('derived state', () => {
    it('reports canLink=true when all requirements are met', () => {
      const { result } = renderLinkageHook();

      expect(result.current.canLink).toBe(true);
      expect(result.current.hasMoneyAccountRequirements).toBe(true);
      expect(result.current.hasMoneyAccountBaseRequirements).toBe(true);
      expect(result.current.isCardAuthenticated).toBe(true);
      expect(result.current.isCardLinkedToMoneyAccount).toBe(false);
      expect(result.current.moneyAccountCardToken).toBe(MOCK_TOKEN);
      expect(result.current.status).toBe('idle');
      expect(result.current.isLinking).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('reports isCardLinkedToMoneyAccount=true when the Money Account is already delegated for card', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();

      expect(result.current.isCardLinkedToMoneyAccount).toBe(true);
    });

    it('reports canLink=false when the card is not authenticated', () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when the card user is not VERIFIED', () => {
      applySelectorMocks(buildSelectors({ isCardVerified: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
      expect(result.current.isCardVerified).toBe(false);
    });

    it('reports isCardVerified=true when verification status is VERIFIED', () => {
      const { result } = renderLinkageHook();
      expect(result.current.isCardVerified).toBe(true);
    });

    it('reports canLink=false when there is no Money account', () => {
      applySelectorMocks(buildSelectors({ primaryMoneyAccount: undefined }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when the feature flag is off', () => {
      applySelectorMocks(buildSelectors({ isMoneyAccountVisible: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when vault config is missing', () => {
      applySelectorMocks(buildSelectors({ vaultConfig: undefined }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when VEDA is not allowlisted in the cardFeature flag', () => {
      applySelectorMocks(
        buildSelectors({
          cardFeatureFlag: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: '0xusdc',
                    symbol: 'USDC',
                    decimals: 6,
                    enabled: true,
                    name: 'USD Coin',
                  },
                ],
              },
            },
          },
        }),
      );
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
      expect(result.current.hasMoneyAccountRequirements).toBe(false);
      expect(result.current.hasMoneyAccountBaseRequirements).toBe(true);
      expect(result.current.moneyAccountCardToken).toBeNull();
    });

    it('reports hasMoneyAccountBaseRequirements=true when VEDA is not allowlisted but base requirements are met', () => {
      applySelectorMocks(
        buildSelectors({
          cardFeatureFlag: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: '0xusdc',
                    symbol: 'USDC',
                    decimals: 6,
                    enabled: true,
                    name: 'USD Coin',
                  },
                ],
              },
            },
          },
        }),
      );
      const { result } = renderLinkageHook();
      expect(result.current.hasMoneyAccountBaseRequirements).toBe(true);
      expect(result.current.hasMoneyAccountRequirements).toBe(false);
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=true when VEDA is allowlisted by address under the mUSD display symbol', () => {
      applySelectorMocks(
        buildSelectors({
          cardFeatureFlag: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: '0xveda',
                    symbol: 'mUSD',
                    decimals: 6,
                    enabled: true,
                    name: 'MetaMask USD',
                  },
                ],
              },
            },
          },
        }),
      );
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(true);
      expect(result.current.hasMoneyAccountRequirements).toBe(true);
      expect(result.current.hasMoneyAccountBaseRequirements).toBe(true);
      expect(result.current.moneyAccountCardToken).toBe(MOCK_TOKEN);
    });

    it('reports canLink=false when VEDA is present but disabled in the cardFeature flag', () => {
      applySelectorMocks(
        buildSelectors({
          cardFeatureFlag: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: '0xveda',
                    symbol: 'veda',
                    decimals: 6,
                    enabled: false,
                    name: 'Veda',
                  },
                ],
              },
            },
          },
        }),
      );
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
      expect(result.current.hasMoneyAccountRequirements).toBe(false);
      expect(result.current.moneyAccountCardToken).toBeNull();
    });

    it('reports canLink=false when the Monad USDC token cannot be resolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when the Money Account is already delegated for card (re-link suppressed)', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when Monad gas-fee sponsorship is disabled', () => {
      applySelectorMocks(buildSelectors({ isMonadSponsorshipEnabled: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when card residency is blocked', () => {
      applySelectorMocks(buildSelectors({ isResidencyBlocked: true }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
      expect(result.current.isResidencyBlocked).toBe(true);
    });

    it('reports isResidencyBlocked=false when residency is not blocked', () => {
      applySelectorMocks(buildSelectors({ isResidencyBlocked: false }));
      const { result } = renderLinkageHook();
      expect(result.current.isResidencyBlocked).toBe(false);
    });

    it('reports isLinking=true when controller linkage is in progress', () => {
      applySelectorMocks(
        buildSelectors({ moneyAccountCardLinkInProgress: true }),
      );
      const { result } = renderLinkageHook();
      expect(result.current.isLinking).toBe(true);
    });
  });

  describe('linkage in progress guards', () => {
    const ORIGIN = {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    } as const;

    it('does not navigate from openLinkCardSheet when linkage is in progress', () => {
      applySelectorMocks(
        buildSelectors({ moneyAccountCardLinkInProgress: true }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not navigate from startLinkFlow when linkage is in progress', () => {
      applySelectorMocks(
        buildSelectors({ moneyAccountCardLinkInProgress: true }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('openLinkCardSheet (sheet entrypoint)', () => {
    it('navigates to the Link Card sheet and does NOT call the controller when canLink is true', () => {
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        ...expectedLinkCardSheetRoute(),
      });
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });

    it('fails closed (error toast, no nav, no controller call) when canLink is false', () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0]).toMatchObject({
        labelOptions: [{ label: 'Something went wrong linking your card' }],
      });
    });

    it('fails closed when the Monad USDC token cannot be resolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('fails closed when there is no primary Money account', () => {
      applySelectorMocks(buildSelectors({ primaryMoneyAccount: undefined }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('fails closed when the Money Account is already delegated (defensive guard for direct callers)', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('tracks RESIDENCY_BLOCKED and fails closed when residency is blocked', () => {
      applySelectorMocks(buildSelectors({ isResidencyBlocked: true }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet(CardEntryPoint.MONEY_LINK_CARD_SHEET);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'built-event' }),
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
          reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
          entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        }),
      );
    });
  });

  describe('startLinkFlow (entrypoint branching)', () => {
    const ORIGIN = {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    } as const;

    it('opens the Link Card sheet when the user is authenticated and can link', () => {
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        ...expectedLinkCardSheetRoute(),
      });
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('no-ops when the user is authenticated but not VERIFIED', () => {
      applySelectorMocks(buildSelectors({ isCardVerified: false }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('no-ops when the user is authenticated and the Money Account is already delegated', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows the error toast and does not navigate when Money Account requirements are missing', () => {
      applySelectorMocks(buildSelectors({ vaultConfig: undefined }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('tracks RESIDENCY_BLOCKED and fails closed when residency is blocked', () => {
      applySelectorMocks(buildSelectors({ isResidencyBlocked: true }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow({
          ...ORIGIN,
          entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        });
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
          reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
          entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        }),
      );
    });

    it('shows the error toast when Monad USDC cannot be resolved AND the user is authenticated', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('routes a not-authenticated cardholder to CardAuthentication with postAuthRedirect and sets the pending flag', () => {
      applySelectorMocks(
        buildSelectors({ isCardAuthenticated: false, isCardholder: true }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(CardEntryPoint.MONEY_LINK_CARD_SHEET),
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.AUTHENTICATION,
          params: { postAuthRedirect: ORIGIN, showAuthPrompt: true },
        },
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('routes an unauthenticated cardholder to CardAuthentication when base requirements are met but VEDA is not allowlisted', () => {
      applySelectorMocks(
        buildSelectors({
          isCardAuthenticated: false,
          isCardholder: true,
          cardFeatureFlag: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: '0xusdc',
                    symbol: 'USDC',
                    decimals: 6,
                    enabled: true,
                    name: 'USD Coin',
                  },
                ],
              },
            },
          },
        }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(CardEntryPoint.MONEY_LINK_CARD_SHEET),
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.AUTHENTICATION,
          params: { postAuthRedirect: ORIGIN, showAuthPrompt: true },
        },
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('stores the origin entrypoint for the post-auth sheet resume', () => {
      applySelectorMocks(
        buildSelectors({ isCardAuthenticated: false, isCardholder: true }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow({
          ...ORIGIN,
          entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        });
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(
          CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        ),
      );
    });

    it('routes a not-authenticated non-cardholder to Card Onboarding without arming the sheet-resume flag', () => {
      applySelectorMocks(
        buildSelectors({ isCardAuthenticated: false, isCardholder: false }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: { postAuthRedirect: ORIGIN },
        },
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('still routes a not-authenticated cardholder to CardAuthentication when the funding token is null (token resolves after login)', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      applySelectorMocks(
        buildSelectors({ isCardAuthenticated: false, isCardholder: true }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(CardEntryPoint.MONEY_LINK_CARD_SHEET),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.AUTHENTICATION,
          params: { postAuthRedirect: ORIGIN, showAuthPrompt: true },
        },
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('still routes a not-authenticated non-cardholder to onboarding without arming the sheet-resume flag when the funding token is null (token resolves after login)', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      applySelectorMocks(
        buildSelectors({ isCardAuthenticated: false, isCardholder: false }),
      );
      const { result } = renderLinkageHook();

      act(() => {
        result.current.startLinkFlow(ORIGIN);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: { postAuthRedirect: ORIGIN },
        },
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('resume effect (pendingMoneyAccountCardLink)', () => {
    it('clears the pending flag without opening the sheet when authenticated but not VERIFIED', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          isCardVerified: false,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each(['idle', 'loading'] as const)(
      'keeps the pending flag while card data is still %s and verification is unknown',
      (cardHomeDataStatus) => {
        applySelectorMocks(
          buildSelectors({
            pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            isCardVerified: false,
            cardHomeDataStatus,
          }),
        );
        renderLinkageHook();

        expect(mockDispatch).not.toHaveBeenCalledWith(
          setPendingMoneyAccountCardLink(null),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
      },
    );

    it('opens the Link Card sheet and clears the flag when authenticated and canLink', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        ...expectedLinkCardSheetRoute(),
      });
    });

    it('preserves the pending entrypoint when opening the sheet after auth', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink:
            CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MONEY.MODALS.ROOT,
        expectedLinkCardSheetRoute(CardEntryPoint.MONEY_HOME_ONBOARDING_CARD),
      );
    });

    it('clears the flag silently when authenticated but already delegated', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          isAlreadyDelegated: true,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('tracks RESIDENCY_BLOCKED, shows error toast, and clears the flag when residency is blocked after auth', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          isResidencyBlocked: true,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
          reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
          entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        }),
      );
    });

    it('clears the flag silently when authenticated but requirements are missing', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          vaultConfig: undefined,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does nothing while the user is not yet authenticated', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          isCardAuthenticated: false,
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each(['idle', 'loading'] as const)(
      'keeps the pending flag while VEDA support is unresolved and card home data is still %s',
      (cardHomeDataStatus) => {
        applySelectorMocks(
          buildSelectors({
            pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            vedaConfig: undefined,
            cardHomeDataStatus,
          }),
        );
        renderLinkageHook();

        expect(mockDispatch).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalled();
      },
    );

    it.each(['success', 'error'] as const)(
      'clears the flag silently once card home data has %s but VEDA support is unresolved',
      (cardHomeDataStatus) => {
        applySelectorMocks(
          buildSelectors({
            pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
            vedaConfig: undefined,
            cardHomeDataStatus,
          }),
        );
        renderLinkageHook();

        expect(mockDispatch).toHaveBeenCalledWith(
          setPendingMoneyAccountCardLink(null),
        );
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockShowToast).not.toHaveBeenCalled();
      },
    );

    it('opens the sheet on rerender once VEDA support resolves after card home data succeeds', () => {
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          vedaConfig: undefined,
          cardHomeDataStatus: 'loading',
        }),
      );
      const { rerender } = renderLinkageHook();

      // First render: VEDA config not yet loaded, flag must stay set.
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();

      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'success',
        }),
      );
      rerender();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        ...expectedLinkCardSheetRoute(),
      });
    });

    it('keeps the flag set when the funding token is null but card home data is still loading', () => {
      mockResolveMoneyAccountCardToken.mockReturnValue(null);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'loading',
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('keeps the flag set when the funding token is null and card home data is still idle', () => {
      mockResolveMoneyAccountCardToken.mockReturnValue(null);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'idle',
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('clears the flag silently once card home data has loaded but the funding token is still unresolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValue(null);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'success',
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('clears the flag silently when card home data fetch errors and the funding token cannot be resolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValue(null);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'error',
        }),
      );
      renderLinkageHook();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('opens the sheet on rerender once the funding token resolves after card home data succeeds', () => {
      mockResolveMoneyAccountCardToken.mockReturnValue(null);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'loading',
        }),
      );
      const { rerender } = renderLinkageHook();

      // First render: data still loading, flag must stay set.
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();

      mockResolveMoneyAccountCardToken.mockReturnValue(MOCK_TOKEN);
      applySelectorMocks(
        buildSelectors({
          pendingMoneyAccountCardLink: CardEntryPoint.MONEY_LINK_CARD_SHEET,
          cardHomeDataStatus: 'success',
        }),
      );
      rerender();

      expect(mockDispatch).toHaveBeenCalledWith(
        setPendingMoneyAccountCardLink(null),
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        ...expectedLinkCardSheetRoute(),
      });
    });
  });

  describe('confirmLinkInBackground - happy path', () => {
    it('transitions idle -> pending -> success and calls the controller once with BAANX_MAX_LIMIT and the MA address', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(true);
      expect(result.current.status).toBe('success');
      expect(result.current.error).toBeNull();
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledTimes(1);
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: BAANX_MAX_LIMIT,
      });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_COMPLETED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        is_revoke: false,
      });
    });

    it('does NOT navigate to the sheet (sheet is the caller, not the callee)', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);
      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows the single-line pending toast with a Spinner startAccessory before the success toast', async () => {
      let resolveLink: () => void = () => undefined;
      mockLinkMoneyAccountCard.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveLink = resolve;
        }),
      );

      const { result } = renderLinkageHook();

      let linkPromise: Promise<boolean> | undefined;
      act(() => {
        linkPromise = result.current.confirmLinkInBackground();
      });

      const pendingCall = mockShowToast.mock.calls[0]?.[0];
      expect(pendingCall).toMatchObject({
        hasNoTimeout: true,
        labelOptions: [{ label: 'Linking your card' }],
      });
      expect(pendingCall?.startAccessory).toBeDefined();

      await act(async () => {
        resolveLink();
        await linkPromise;
      });

      const successCall = mockShowToast.mock.calls[1]?.[0];
      expect(successCall).toMatchObject({
        labelOptions: [{ label: 'Your card is ready to use' }],
        hasNoTimeout: false,
      });
    });

    it('passes the caller-supplied delegationAmountHuman through to the controller', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);

      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground({
          delegationAmountHuman: '100',
        });
      });

      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '100',
      });
    });

    it('falls back to BAANX_MAX_LIMIT when no delegationAmountHuman is provided (sheet caller path)', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);

      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground();
      });

      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: BAANX_MAX_LIMIT,
      });
    });
  });

  describe('confirmLinkInBackground - failure paths', () => {
    it('sets status=error and shows error toast on generic reject', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('boom');
      expect(Logger.error).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        reason: CardLinkingFailureReason.CONTROLLER_FAILED,
        error_name: 'Error',
        is_revoke: false,
      });

      const errorCall = mockShowToast.mock.calls.at(-1)?.[0];
      expect(errorCall).toMatchObject({
        labelOptions: [{ label: 'Something went wrong linking your card' }],
        hasNoTimeout: false,
      });
    });

    it('sets status=cancelled and shows NO error toast on UserCancelledError', async () => {
      const { UserCancelledError } = jest.requireMock('./useCardDelegation');
      mockLinkMoneyAccountCard.mockRejectedValueOnce(
        new UserCancelledError('User denied'),
      );

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('cancelled');
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        reason: CardLinkingFailureReason.USER_CANCELLED,
        is_revoke: false,
      });

      // Only the pending toast should have fired — no error toast.
      const lastCall = mockShowToast.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ hasNoTimeout: true });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('fails closed when canLink is false (defence in depth): no controller call, error toast, returns false', async () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
      );
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_STARTED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        reason: CardLinkingFailureReason.PRECONDITION_FAILED,
        is_revoke: false,
      });
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0]).toMatchObject({
        labelOptions: [{ label: 'Something went wrong linking your card' }],
      });
    });

    it('tracks RESIDENCY_BLOCKED when residency is blocked and user is not already delegated', async () => {
      applySelectorMocks(buildSelectors({ isResidencyBlocked: true }));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith({
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        entrypoint: CardEntryPoint.MONEY_LINK_CARD_SHEET,
        reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
        is_revoke: false,
      });
    });

    it('still submits the delegation when already delegated (Manage Limit update / revoke path)', async () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();

      // canLink is gated on !isAlreadyDelegated, but submit must work so the
      // user can change the spending cap or revoke it via Manage Limit.
      expect(result.current.canLink).toBe(false);

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground({
          delegationAmountHuman: '0',
        });
      });

      expect(returned).toBe(true);
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledTimes(1);
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith(
        expect.objectContaining({ delegationAmountHuman: '0' }),
      );
    });

    it('shows the unlink pending + success toasts when delegationAmountHuman is 0', async () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      let resolveLink: (() => void) | undefined;
      mockLinkMoneyAccountCard.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveLink = resolve;
          }),
      );

      const { result } = renderLinkageHook();

      let linkPromise: Promise<boolean> | undefined;
      await act(async () => {
        linkPromise = result.current.confirmLinkInBackground({
          delegationAmountHuman: '0',
        });
      });

      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Unlinking your card' }],
        }),
      );

      await act(async () => {
        resolveLink?.();
        await linkPromise;
      });

      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Your card was unlinked' }],
        }),
      );
    });

    it('shows the unlink error toast when the revoke submission fails', async () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('revoke boom'));

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground({
          delegationAmountHuman: '0',
        });
      });

      expect(returned).toBe(false);
      expect(mockShowToast).toHaveBeenLastCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Something went wrong unlinking your card' }],
        }),
      );
    });
  });

  describe('reset', () => {
    it('clears status and error back to idle / null', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground();
      });
      expect(result.current.status).toBe('error');
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });

  describe('confirmLinkInBackground - singleflight', () => {
    it('silently no-ops when CardController.isLinkageInProgress() returns true', async () => {
      mockIsLinkageInProgress.mockReturnValue(true);

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('silently handles CardLinkageInProgressError thrown by the controller (defence-in-depth)', async () => {
      const { CardLinkageInProgressError } = jest.requireMock(
        '../../../../core/Engine/controllers/card-controller/provider-types',
      );
      mockIsLinkageInProgress.mockReturnValue(false);
      mockLinkMoneyAccountCard.mockRejectedValueOnce(
        new CardLinkageInProgressError(),
      );

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      // The pending toast WAS shown — we cleared the sync gate, so the
      // UI side-effect ran. But the in-progress catch branch must NOT
      // surface a success or error toast.
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      const onlyToast = mockShowToast.mock.calls[0]?.[0];
      expect(onlyToast).toMatchObject({ hasNoTimeout: true });
      // Not an error: must not be logged or transitioned to error state.
      expect(Logger.error).not.toHaveBeenCalled();
      // Critical cleanup: the catch branch must roll back the local UI
      // state so the second hook instance does NOT get stuck in a
      // `pending` / `isLinking=true` shape. The first call's eventual
      // success/error toast will replace the pending spinner toast.
      expect(result.current.status).toBe('idle');
      expect(result.current.isLinking).toBe(false);
      expect(result.current.error).toBeNull();
      // Must emit a FAILED event to balance the STARTED already emitted,
      // otherwise MetaMetrics is left with an orphan started event.
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: CardLinkingFailureReason.CONTROLLER_FAILED,
          error_name: 'CardLinkageInProgressError',
        }),
      );
    });
  });
});
