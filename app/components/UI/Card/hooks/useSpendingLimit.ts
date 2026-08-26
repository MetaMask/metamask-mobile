import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  useFocusEffect,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { useCardDelegation, UserCancelledError } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import {
  CardType,
  FundingStatus,
  CardFundingToken,
  DelegationSettingsResponse,
} from '../types';
import {
  BAANX_MAX_LIMIT,
  caipChainIdToNetwork,
  CARD_CHAIN_IDS,
  cardNetworkInfos,
} from '../constants';
import {
  buildDelegationTokenList,
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
import useMoneyAccountCardLinkage from './useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import { useCardHomeData } from './useCardHomeData';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { CaipChainId, Hex } from '@metamask/utils';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../util/metrics';
import { selectCardActiveProviderId } from '../../../../selectors/cardController';

export type LimitType = 'full' | 'restricted';

export interface UseSpendingLimitParams {
  flow: 'manage' | 'enable' | 'onboarding' | 'enable_card';
  initialToken?: CardFundingToken | null;
  priorityToken?: CardFundingToken | null;
  allTokens: CardFundingToken[];
  delegationSettings: DelegationSettingsResponse | null;
  routeParams?: Record<string, unknown>;
}

export interface UseSpendingLimitReturn {
  // State
  selectedToken: CardFundingToken | null;
  limitType: LimitType;
  customLimit: string;
  isLoading: boolean;
  isUiInteractionLocked: boolean;

  // Handlers
  setSelectedToken: (token: CardFundingToken | null) => void;
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

  isMoneyAccountSource: boolean;
  isMoneyAccountLocked: boolean;
  canShowMoneyAccountCta: boolean;
  selectMoneyAccountAsSource: () => void;
  moneyAccountTotalFiatFormatted: string | undefined;
  canLinkMoneyAccount: boolean;
  moneyAccountApyPercent: number | undefined;
  hasMetalCard: boolean;

  /** False for intentional exits so beforeRemove cannot swallow navigation. */
  shouldBlockNavigation: () => boolean;
}

const deriveLimitStateFromToken = (
  token: CardFundingToken,
): Pick<UseSpendingLimitReturn, 'limitType' | 'customLimit'> => {
  if (token.fundingStatus !== FundingStatus.Limited) {
    return {
      limitType: 'full',
      customLimit: '',
    };
  }

  return {
    limitType: 'restricted',
    customLimit: sanitizeCustomLimit(
      token.originalSpendingCap ?? token.spendingCap ?? '',
    ),
  };
};

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
  routeParams,
}: UseSpendingLimitParams): UseSpendingLimitReturn => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const { sdk } = useCardSDK();

  const initialLimitState = initialToken
    ? deriveLimitStateFromToken(initialToken)
    : { limitType: 'full' as const, customLimit: '' };

  // Form state
  const [selectedToken, setSelectedToken] = useState<CardFundingToken | null>(
    initialToken ?? null,
  );
  const [limitType, setLimitType] = useState<LimitType>(
    initialLimitState.limitType,
  );
  const [customLimit, setCustomLimitState] = useState(
    initialLimitState.customLimit,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isMoneyAccountSource, setIsMoneyAccountSource] = useState(false);
  // True when selectedToken came from auto-init (not an explicit user choice).
  const [isAutoSelectedDefault, setIsAutoSelectedDefault] = useState(false);

  const isOnboardingFlow = flow === 'onboarding';
  const isEnableCardFlow = flow === 'enable_card';
  const isEnableFlow = flow === 'enable';
  const isManageFlow = flow === 'manage';
  const isOnboardingLikeFlow = isOnboardingFlow || isEnableCardFlow;
  const isMoneyAccountPreselectAllowed = isOnboardingLikeFlow;
  const isEnablingNotEnabledToken =
    isEnableFlow && initialToken?.fundingStatus === FundingStatus.NotEnabled;

  const {
    moneyAccountCardToken,
    confirmLinkInBackground: confirmMoneyAccountLinkInBackground,
    canLink: canLinkMoneyAccount,
  } = useMoneyAccountCardLinkage();
  const { totalFiatFormatted: moneyAccountTotalFiatFormatted } =
    useMoneyAccountBalance();
  const { apyPercent: moneyAccountApyPercent } = useMoneyVaultApy();

  const { data: cardHomeData } = useCardHomeData();
  const hasMetalCard = cardHomeData?.card?.type === CardType.METAL;

  const hasUserExitedMoneyAccountSourceRef = useRef(false);
  const isExitingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isMoneyAccountSourceRef = useRef(false);

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
      setIsAutoSelectedDefault(false);
      if (isMoneyAccountSource) {
        setIsMoneyAccountSource(false);
        hasUserExitedMoneyAccountSourceRef.current = true;
      }
    }
  }, [selectedAccount?.id, isMoneyAccountSource]);

  // Delegation hook (includes faucet check)
  const {
    submitDelegation,
    isLoading: isDelegationLoading,
    needsFaucet,
    isFaucetCheckLoading,
  } = useCardDelegation(selectedToken);

  const isLoading = isDelegationLoading || isProcessing;
  const isUiInteractionLocked =
    isLoading && (!isMoneyAccountSource || isOnboardingFlow);

  isLoadingRef.current = isLoading;
  isMoneyAccountSourceRef.current = isMoneyAccountSource;

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

  const applySelectedToken = useCallback((token: CardFundingToken) => {
    const nextLimitState = deriveLimitStateFromToken(token);
    setSelectedToken(token);
    setLimitType(nextLimitState.limitType);
    setCustomLimitState(nextLimitState.customLimit);
  }, []);

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
        .addProperties(
          withCardProvider(activeProviderId, {
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
          }),
        )
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    activeProviderId,
    flow,
    allTokens,
    walletTokens,
    allWalletTokens,
  ]);

  useEffect(() => {
    if (hasInitialized) return;

    if (initialToken) {
      applySelectedToken(initialToken);
      setIsAutoSelectedDefault(false);
      setHasInitialized(true);
      return;
    }

    if (
      isManageFlow &&
      priorityToken?.isMoneyAccountEntry &&
      !hasUserExitedMoneyAccountSourceRef.current
    ) {
      setIsMoneyAccountSource(true);
      applySelectedToken(priorityToken);
      setIsAutoSelectedDefault(true);
      setHasInitialized(true);
      return;
    }

    if (
      isMoneyAccountPreselectAllowed &&
      canLinkMoneyAccount &&
      !hasUserExitedMoneyAccountSourceRef.current &&
      moneyAccountCardToken
    ) {
      setIsMoneyAccountSource(true);
      applySelectedToken(moneyAccountCardToken);
      setIsAutoSelectedDefault(true);
      setHasInitialized(true);
      return;
    }

    if (!selectedToken && priorityToken) {
      applySelectedToken(priorityToken);
      setIsAutoSelectedDefault(true);
      setHasInitialized(true);
      return;
    }

    const notEnabledTokens = allTokens.filter(
      (t) => t.fundingStatus === FundingStatus.NotEnabled,
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
        : buildDelegationTokenList({
            delegationSettings,
            getSupportedTokensByChainId: getSdkTokens ?? (() => []),
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
      const defaultToken = sorted[0]?.token;
      if (defaultToken) {
        applySelectedToken(defaultToken);
        setIsAutoSelectedDefault(true);
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
    applySelectedToken,
    isManageFlow,
    isMoneyAccountPreselectAllowed,
    canLinkMoneyAccount,
    moneyAccountCardToken,
  ]);

  // Upgrade auto-picked default to Money Account when canLink resolves late.
  useEffect(() => {
    if (!isMoneyAccountPreselectAllowed) return;
    if (!isAutoSelectedDefault) return;
    if (isMoneyAccountSource) return;
    if (hasUserExitedMoneyAccountSourceRef.current) return;
    if (!canLinkMoneyAccount || !moneyAccountCardToken) return;

    setIsMoneyAccountSource(true);
    applySelectedToken(moneyAccountCardToken);
    setIsAutoSelectedDefault(true);
  }, [
    isMoneyAccountPreselectAllowed,
    isAutoSelectedDefault,
    isMoneyAccountSource,
    canLinkMoneyAccount,
    moneyAccountCardToken,
    applySelectedToken,
  ]);

  // Handle returned values from modal sheets
  useFocusEffect(
    useCallback(() => {
      const params = routeParams as
        | {
            returnedSelectedToken?: CardFundingToken;
            returnedLimitType?: LimitType;
            returnedCustomLimit?: string;
          }
        | undefined;

      if (params?.returnedSelectedToken) {
        applySelectedToken(params.returnedSelectedToken);
        setIsAutoSelectedDefault(false);
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
    }, [routeParams, navigation, applySelectedToken]),
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
    navigateWithDetails(
      navigation,
      createAccountSelectorNavDetails({
        disableAddAccountButton: true,
        onSelectAccount: () => {
          if (!isMoneyAccountSource) return;
          setIsMoneyAccountSource(false);
          hasUserExitedMoneyAccountSourceRef.current = true;
          setHasInitialized(false);
          setSelectedToken(null);
        },
      }),
    );
  }, [navigation, isMoneyAccountSource]);

  const handleOtherSelect = useCallback(() => {
    if (isMoneyAccountSource) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.OTHER_TOKEN_BUTTON,
          }),
        )
        .build(),
    );

    const { selectedToken: _excludedSelectedToken, ...restParams } =
      routeParams ?? {};

    const excludedTokens = selectedToken ? [selectedToken] : [];

    navigateWithDetails(
      navigation,
      createAssetSelectionModalNavigationDetails({
        selectionOnly: true,
        excludedTokens,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: restParams as Record<string, unknown>,
      }),
    );
  }, [
    isMoneyAccountSource,
    navigation,
    selectedToken,
    trackEvent,
    createEventBuilder,
    activeProviderId,
    routeParams,
  ]);

  const selectMoneyAccountAsSource = useCallback(() => {
    if (!moneyAccountCardToken) return;
    hasUserExitedMoneyAccountSourceRef.current = false;
    setIsMoneyAccountSource(true);
    applySelectedToken(moneyAccountCardToken);
    setIsAutoSelectedDefault(false);
  }, [moneyAccountCardToken, applySelectedToken]);

  const canShowMoneyAccountCta =
    (isOnboardingLikeFlow || isEnablingNotEnabledToken) &&
    !isMoneyAccountSource &&
    canLinkMoneyAccount;

  const isMoneyAccountLocked = Boolean(
    isManageFlow && priorityToken?.isMoneyAccountEntry,
  );

  const handleLimitSelect = useCallback(() => {
    navigateWithDetails(
      navigation,
      createSpendingLimitOptionsNavigationDetails({
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
    toast({
      title: strings('card.card_spending_limit.update_success'),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, []);

  const showErrorToast = useCallback((message?: string) => {
    toast({
      title: message || strings('card.card_spending_limit.update_error'),
      severity: ToastSeverity.Danger,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, []);

  // Navigation helpers
  const navigateToCardHome = useCallback(() => {
    isExitingRef.current = true;
    navigation.dispatch(
      StackActions.replace(Routes.CARD.HOME, {
        fromCardOnboarding: isOnboardingFlow,
      }),
    );
  }, [navigation, isOnboardingFlow]);

  const shouldBlockNavigation = useCallback(() => {
    if (isExitingRef.current) return false;
    const loading = isLoadingRef.current;
    const moneySource = isMoneyAccountSourceRef.current;
    return loading && (!moneySource || isOnboardingFlow);
  }, [isOnboardingFlow]);

  // Actions
  const submit = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.ENABLE_TOKEN_CONFIRM_BUTTON,
          }),
        )
        .build(),
    );

    if (isMoneyAccountSource) {
      setIsProcessing(true);
      try {
        const success = await confirmMoneyAccountLinkInBackground({
          delegationAmountHuman: delegationAmount,
        });
        if (success) {
          try {
            await Engine.context.CardController.fetchCardHomeData({
              force: true,
            });
          } catch (error) {
            Logger.error(
              error as Error,
              'Failed to refresh card home data after Money Account link',
            );
          }
          if (isOnboardingFlow) {
            navigateToCardHome();
          } else if (navigation.isFocused()) {
            isExitingRef.current = true;
            navigation.goBack();
          }
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

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
      await Engine.context.CardController.fetchCardHomeData({ force: true });

      if (!isOnboardingFlow) {
        showSuccessToast();
      }

      setIsProcessing(false);

      if (isOnboardingFlow) {
        navigateToCardHome();
      } else {
        isExitingRef.current = true;
        navigation.goBack();
      }
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
    activeProviderId,
    isMoneyAccountSource,
    confirmMoneyAccountLinkInBackground,
  ]);

  const cancel = useCallback(() => {
    if (isLoading) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
          }),
        )
        .build(),
    );

    isExitingRef.current = true;
    navigation.goBack();
  }, [navigation, trackEvent, createEventBuilder, activeProviderId, isLoading]);

  const skip = useCallback(() => {
    if (isLoading) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(activeProviderId, {
            action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
            skipped: true,
          }),
        )
        .build(),
    );

    navigateToCardHome();
  }, [
    trackEvent,
    createEventBuilder,
    activeProviderId,
    isLoading,
    navigateToCardHome,
  ]);

  return {
    // State
    selectedToken,
    limitType,
    customLimit,
    isLoading,
    isUiInteractionLocked,

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

    isMoneyAccountSource,
    isMoneyAccountLocked,
    canShowMoneyAccountCta,
    selectMoneyAccountAsSource,
    moneyAccountTotalFiatFormatted,
    canLinkMoneyAccount,
    moneyAccountApyPercent,
    hasMetalCard,
    shouldBlockNavigation,
  };
};

export default useSpendingLimit;

// Re-export for backwards compatibility
export { LINEA_CAIP_CHAIN_ID } from '../util/buildTokenList';
