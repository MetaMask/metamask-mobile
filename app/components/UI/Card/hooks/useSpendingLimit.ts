import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useContext,
  useRef,
} from 'react';
import {
  useFocusEffect,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { useCardDelegation, UserCancelledError } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../types';
import {
  BAANX_MAX_LIMIT,
  caipChainIdToNetwork,
  CARD_CHAIN_IDS,
  cardNetworkInfos,
} from '../constants';
import {
  buildTokenListFromSettings,
  LINEA_CAIP_CHAIN_ID,
} from '../util/buildTokenList';
import { sanitizeCustomLimit } from '../util/sanitizeCustomLimit';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { createAssetSelectionModalNavigationDetails } from '../components/AssetSelectionBottomSheet';
import { createSpendingLimitOptionsNavigationDetails } from '../Views/SpendingLimit/components/SpendingLimitOptionsSheet';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { CaipChainId, Hex } from '@metamask/utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { CardActions, CardScreens } from '../util/metrics';

export type LimitType = 'full' | 'restricted';

export interface UseSpendingLimitParams {
  flow: 'manage' | 'enable' | 'onboarding';
  initialToken?: CardTokenAllowance | null;
  priorityToken?: CardTokenAllowance | null;
  allTokens: CardTokenAllowance[];
  delegationSettings: DelegationSettingsResponse | null;
  externalWalletDetailsData?:
    | {
        walletDetails: never[];
        mappedWalletDetails: never[];
        priorityWalletDetail: null;
      }
    | {
        walletDetails: CardExternalWalletDetailsResponse;
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      }
    | null;
  routeParams?: Record<string, unknown>;
}

export interface UseSpendingLimitReturn {
  // State
  selectedToken: CardTokenAllowance | null;
  limitType: LimitType;
  customLimit: string;
  isLoading: boolean;

  // Handlers
  setSelectedToken: (token: CardTokenAllowance | null) => void;
  handleAccountSelect: () => void;
  handleOtherSelect: () => void;
  handleLimitSelect: () => void;
  setLimitType: (type: LimitType) => void;
  setCustomLimit: (value: string) => void;

  // Actions
  submit: () => Promise<void>;
  cancel: () => void;
  skip: () => void;

  // Validation
  isValid: boolean;

  // Faucet state
  needsFaucet: boolean;
  isFaucetCheckLoading: boolean;
}

/**
 * Simplified hook for spending limit management.
 * Combines form state and submission logic into a single hook.
 *
 * Supports three flows:
 * - onboarding: First-time delegation setup
 * - enable: Enabling a new token from AssetSelectionBottomSheet
 * - manage: Managing existing spending limits
 */
const useSpendingLimit = ({
  flow,
  initialToken,
  priorityToken,
  allTokens,
  delegationSettings,
  externalWalletDetailsData,
  routeParams,
}: UseSpendingLimitParams): UseSpendingLimitReturn => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { sdk } = useCardSDK();

  // Form state
  const [selectedToken, setSelectedToken] = useState<CardTokenAllowance | null>(
    initialToken ?? null,
  );
  const [limitType, setLimitType] = useState<LimitType>('full');
  const [customLimit, setCustomLimitState] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const isOnboardingFlow = flow === 'onboarding';

  // Track account changes to reset token selection when user switches account
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const accountIdRef = useRef(selectedAccount?.id);

  // Guard that ensures the screen-view analytics event fires exactly once,
  // but only after allTokens has loaded (non-empty) so cardSupportedKeys is accurate.
  const screenViewFiredRef = useRef(false);

  useEffect(() => {
    if (selectedAccount?.id && selectedAccount.id !== accountIdRef.current) {
      accountIdRef.current = selectedAccount.id;
      setHasInitialized(false);
      setSelectedToken(null);
    }
  }, [selectedAccount?.id]);

  // Delegation hook (includes faucet check)
  const {
    submitDelegation,
    isLoading: isDelegationLoading,
    needsFaucet,
    isFaucetCheckLoading,
  } = useCardDelegation(selectedToken);

  const isLoading = isDelegationLoading || isProcessing;

  // Wallet-only token balances for the currently selected MetaMask account.
  // Using this (instead of useAssetBalances) ensures sorting reflects the active
  // account's real wallet balance — not the card's availableBalance or another
  // account's cached data — so account switches are reflected immediately.
  const walletTokens = useTokensWithBalance({
    chainIds: CARD_CHAIN_IDS,
  });

  // All-wallet token balances across every EVM chain the user has configured
  // plus Solana mainnet — used for the top_wallet_chain_asset metric.
  const evmNetworkConfigs = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const allWalletChainIds = useMemo(
    () =>
      [
        ...(Object.keys(evmNetworkConfigs) as Hex[]),
        cardNetworkInfos.solana.caipChainId,
      ] as (Hex | CaipChainId)[],
    [evmNetworkConfigs],
  );
  const allWalletTokens = useTokensWithBalance({ chainIds: allWalletChainIds });

  // Returns 'network:symbol' (e.g. 'linea:musd', 'base:usdc') for analytics.
  // For card chains, uses the friendly network name from caipChainIdToNetwork.
  // For unknown chains, strips the CAIP namespace prefix so the output is
  // always a clean two-part 'chainId:symbol' string (e.g. '1:eth', '137:usdc').
  const toNetworkAsset = (token: {
    chainId: string;
    symbol?: string | null;
  }): string => {
    const caipId = token.chainId.startsWith('0x')
      ? `eip155:${parseInt(token.chainId, 16)}`
      : token.chainId;
    const network =
      caipChainIdToNetwork[caipId as CaipChainId] ??
      caipId.replace(/^[^:]+:/, '');
    return `${network}:${token.symbol?.toLowerCase() ?? ''}`;
  };

  // Track screen view — fires exactly once, after allTokens has loaded so that
  // cardSupportedKeys is accurate and top_card_chain_asset is not spuriously null.
  useEffect(() => {
    if (screenViewFiredRef.current || allTokens.length === 0) return;
    screenViewFiredRef.current = true;

    const screen =
      flow === 'enable' ? CardScreens.ENABLE_TOKEN : CardScreens.SPENDING_LIMIT;

    const musdOnLinea = walletTokens.find(
      (t) =>
        t.symbol?.toUpperCase() === 'MUSD' &&
        (t.chainId === LINEA_CAIP_CHAIN_ID ||
          t.chainId === safeFormatChainIdToHex(LINEA_CAIP_CHAIN_ID)),
    );
    // Only consider tokens actually supported by the card (present in allTokens)
    const cardSupportedKeys = new Set(
      allTokens.map((t) => {
        const chainId = isSolanaChainId(t.caipChainId)
          ? t.caipChainId
          : safeFormatChainIdToHex(t.caipChainId ?? '');
        return `${chainId}:${t.address?.toLowerCase()}`;
      }),
    );
    const topCardToken =
      [...walletTokens]
        .filter((t) => {
          if (!t.address || (t.tokenFiatAmount ?? 0) <= 0) return false;
          const wtChainId = isSolanaChainId(t.chainId)
            ? t.chainId
            : safeFormatChainIdToHex(t.chainId);
          return cardSupportedKeys.has(
            `${wtChainId}:${t.address.toLowerCase()}`,
          );
        })
        .sort(
          (a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0),
        )[0] ?? null;
    const topWalletToken =
      [...allWalletTokens]
        .filter((t) => t.address && (t.tokenFiatAmount ?? 0) > 0)
        .sort(
          (a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0),
        )[0] ?? null;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen,
          flow,
          musd_linea_balance: musdOnLinea?.tokenFiatAmount ?? 0,
          top_card_chain_asset: topCardToken
            ? toNetworkAsset(topCardToken)
            : null,
          top_wallet_chain_asset: topWalletToken
            ? toNetworkAsset(topWalletToken)
            : null,
          top_wallet_asset_balance: topWalletToken?.tokenFiatAmount ?? 0,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    flow,
    allTokens,
    walletTokens,
    allWalletTokens,
  ]);

  useEffect(() => {
    if (hasInitialized) return;

    if (initialToken) {
      setSelectedToken(initialToken);
      setHasInitialized(true);
      return;
    }

    if (!selectedToken && priorityToken) {
      setSelectedToken(priorityToken);
      setHasInitialized(true);
      return;
    }

    const notEnabledTokens = allTokens.filter(
      (t) => t.allowanceState === AllowanceState.NotEnabled,
    );

    const getSdkTokens = sdk
      ? (chainId: `${string}:${string}`) =>
          (sdk.getSupportedTokensByChainId(chainId) ?? []) as {
            address?: string;
            symbol?: string;
            name?: string;
          }[]
      : undefined;

    const tokensToSearch =
      notEnabledTokens.length > 0
        ? notEnabledTokens
        : buildTokenListFromSettings({
            delegationSettings,
            getSupportedTokensByChainId: getSdkTokens,
          });

    if (tokensToSearch.length > 0) {
      const sorted = tokensToSearch
        .map((token) => {
          const chainIdForLookup = isSolanaChainId(token.caipChainId ?? '')
            ? token.caipChainId
            : safeFormatChainIdToHex(token.caipChainId ?? '');
          const walletToken = walletTokens.find(
            (wt) =>
              wt.address?.toLowerCase() === token.address?.toLowerCase() &&
              wt.chainId === chainIdForLookup,
          );
          return { token, fiat: walletToken?.tokenFiatAmount ?? 0 };
        })
        .sort((a, b) => b.fiat - a.fiat);
      const topEntry = sorted[0];
      const defaultToken =
        topEntry.fiat > 0
          ? topEntry.token
          : (tokensToSearch.find(
              (t) =>
                t.symbol?.toUpperCase() === 'MUSD' &&
                t.caipChainId === LINEA_CAIP_CHAIN_ID,
            ) ?? topEntry.token);
      if (defaultToken) {
        setSelectedToken(defaultToken);
        setHasInitialized(true);
      }
    }
  }, [
    hasInitialized,
    initialToken,
    priorityToken,
    selectedToken,
    allTokens,
    walletTokens,
    delegationSettings,
    sdk,
  ]);

  // Handle returned values from modal sheets
  useFocusEffect(
    useCallback(() => {
      const params = routeParams as
        | {
            returnedSelectedToken?: CardTokenAllowance;
            returnedLimitType?: LimitType;
            returnedCustomLimit?: string;
          }
        | undefined;

      if (params?.returnedSelectedToken) {
        setSelectedToken(params.returnedSelectedToken);
        setHasInitialized(true);
        navigation.setParams({
          returnedSelectedToken: undefined,
          selectedToken: undefined,
        } as Record<string, unknown>);
      }

      if (params?.returnedLimitType !== undefined) {
        setLimitType(params.returnedLimitType);
        if (params.returnedCustomLimit !== undefined) {
          setCustomLimitState(params.returnedCustomLimit);
        }
        navigation.setParams({
          returnedLimitType: undefined,
          returnedCustomLimit: undefined,
        } as Record<string, unknown>);
      }
    }, [routeParams, navigation]),
  );

  // Computed delegation amount
  const delegationAmount = useMemo(
    () => (limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0'),
    [limitType, customLimit],
  );

  // Validation
  const isValid = useMemo(() => {
    if (isOnboardingFlow && !selectedToken) return false;
    if (limitType === 'restricted') {
      const num = parseFloat(customLimit);
      return customLimit !== '' && !isNaN(num) && num >= 0;
    }
    return true;
  }, [isOnboardingFlow, selectedToken, limitType, customLimit]);

  // Handlers
  const handleAccountSelect = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({ disableAddAccountButton: true }),
    );
  }, [navigation]);

  const handleOtherSelect = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.OTHER_TOKEN_BUTTON })
        .build(),
    );

    const { selectedToken: _excludedSelectedToken, ...restParams } =
      routeParams ?? {};

    const excludedTokens = selectedToken ? [selectedToken] : [];

    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        tokensWithAllowances: allTokens ?? [],
        delegationSettings,
        cardExternalWalletDetails: externalWalletDetailsData,
        selectionOnly: true,
        excludedTokens,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: restParams as Record<string, unknown>,
      }),
    );
  }, [
    navigation,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    selectedToken,
    trackEvent,
    createEventBuilder,
    routeParams,
  ]);

  const handleLimitSelect = useCallback(() => {
    navigation.navigate(
      ...createSpendingLimitOptionsNavigationDetails({
        currentLimitType: limitType,
        currentCustomLimit: customLimit,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: routeParams as Record<string, unknown> | undefined,
      }),
    );
  }, [navigation, limitType, customLimit, routeParams]);

  const setCustomLimit = useCallback((value: string) => {
    setCustomLimitState(sanitizeCustomLimit(value));
  }, []);

  // Toast helpers
  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_spending_limit.update_success') },
      ],
      iconName: IconName.Confirmation,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const showErrorToast = useCallback(
    (message?: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: message || strings('card.card_spending_limit.update_error'),
          },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });
    },
    [toastRef, theme],
  );

  // Navigation helpers
  const navigateToCardHome = useCallback(() => {
    navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
  }, [navigation]);

  // Actions
  const submit = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.ENABLE_TOKEN_CONFIRM_BUTTON })
        .build(),
    );

    if (!sdk) {
      Logger.error(
        new Error('SDK not available'),
        'Cannot update spending limit',
      );
      showErrorToast();
      return;
    }

    const tokenToUse = selectedToken || priorityToken;
    if (!tokenToUse) {
      showErrorToast();
      return;
    }

    const network = tokenToUse.caipChainId
      ? caipChainIdToNetwork[tokenToUse.caipChainId]
      : null;

    if (!network) {
      showErrorToast('Unsupported network');
      return;
    }

    setIsProcessing(true);

    try {
      await submitDelegation({
        amount: delegationAmount,
        currency: tokenToUse.symbol || '',
        network,
      });

      // Wait for backend to process, then refresh card home data
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await Engine.context.CardController.fetchCardHomeData();

      if (!isOnboardingFlow) {
        showSuccessToast();
      }

      setIsProcessing(false);

      setTimeout(() => {
        if (isOnboardingFlow) {
          navigateToCardHome();
        } else {
          navigation.goBack();
        }
      }, 0);
    } catch (error) {
      setIsProcessing(false);

      if (error instanceof UserCancelledError) {
        Logger.log('User cancelled the delegation transaction');
        return;
      }

      Logger.error(error as Error, 'Failed to save spending limit');
      showErrorToast();
    }
  }, [
    sdk,
    selectedToken,
    priorityToken,
    delegationAmount,
    submitDelegation,
    isOnboardingFlow,
    showSuccessToast,
    showErrorToast,
    navigateToCardHome,
    navigation,
    trackEvent,
    createEventBuilder,
  ]);

  const cancel = useCallback(() => {
    if (isLoading) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON })
        .build(),
    );

    navigation.goBack();
  }, [navigation, trackEvent, createEventBuilder, isLoading]);

  const skip = useCallback(() => {
    if (isLoading) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
          skipped: true,
        })
        .build(),
    );

    navigateToCardHome();
  }, [trackEvent, createEventBuilder, isLoading, navigateToCardHome]);

  return {
    // State
    selectedToken,
    limitType,
    customLimit,
    isLoading,

    // Handlers
    setSelectedToken,
    handleAccountSelect,
    handleOtherSelect,
    handleLimitSelect,
    setLimitType,
    setCustomLimit,

    // Actions
    submit,
    cancel,
    skip,

    // Validation
    isValid,

    // Faucet state
    needsFaucet,
    isFaucetCheckLoading,
  };
};

export default useSpendingLimit;

// Re-export for backwards compatibility
export {
  QUICK_SELECT_TOKENS,
  LINEA_CAIP_CHAIN_ID,
} from '../util/buildTokenList';
