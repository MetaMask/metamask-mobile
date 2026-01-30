import { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import {
  useFocusEffect,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { SolScope } from '@metamask/keyring-api';
import { useTheme } from '../../../../util/theme';
import { useCardDelegation, UserCancelledError } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import {
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../types';
import { BAANX_MAX_LIMIT, caipChainIdToNetwork } from '../constants';
import {
  buildQuickSelectTokens,
  LINEA_CAIP_CHAIN_ID,
  QUICK_SELECT_TOKENS,
} from '../util/buildTokenList';
import { clearCacheData } from '../../../../core/redux/slices/card';
import { createAssetSelectionModalNavigationDetails } from '../components/AssetSelectionBottomSheet';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../util/metrics';

export type LimitType = 'full' | 'restricted';

export interface QuickSelectToken {
  symbol: string;
  token: CardTokenAllowance | null;
}

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
  quickSelectTokens: QuickSelectToken[];
  isOtherSelected: boolean;
  isLoading: boolean;

  // Handlers
  setSelectedToken: (token: CardTokenAllowance | null) => void;
  handleQuickSelectToken: (symbol: string) => void;
  handleOtherSelect: () => void;
  setLimitType: (type: LimitType) => void;
  setCustomLimit: (value: string) => void;

  // Actions
  submit: () => Promise<void>;
  cancel: () => void;
  skip: () => void;

  // Validation
  isValid: boolean;
  isSolanaSelected: boolean;

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
  const dispatch = useDispatch();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useMetrics();
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

  // Delegation hook (includes faucet check)
  const {
    submitDelegation,
    isLoading: isDelegationLoading,
    needsFaucet,
    isFaucetCheckLoading,
  } = useCardDelegation(selectedToken);

  const isLoading = isDelegationLoading || isProcessing;

  // Track screen view
  useEffect(() => {
    const screen =
      flow === 'enable' ? CardScreens.ENABLE_TOKEN : CardScreens.SPENDING_LIMIT;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen, flow })
        .build(),
    );
  }, [trackEvent, createEventBuilder, flow]);

  // Build quick-select tokens with SDK lookup for production addresses (for icons)
  const quickSelectTokens = useMemo(
    () =>
      buildQuickSelectTokens(
        allTokens,
        delegationSettings,
        sdk
          ? (chainId) =>
              (sdk.getSupportedTokensByChainId(chainId) ?? []) as {
                address?: string;
                symbol?: string;
                name?: string;
              }[]
          : undefined,
      ),
    [allTokens, delegationSettings, sdk],
  );

  // Check if "Other" is selected (token not in quick-select list)
  const isOtherSelected = useMemo(() => {
    if (!selectedToken) return false;
    return !QUICK_SELECT_TOKENS.some(
      (symbol) =>
        selectedToken.symbol?.toUpperCase() === symbol.toUpperCase() &&
        selectedToken.caipChainId === LINEA_CAIP_CHAIN_ID,
    );
  }, [selectedToken]);

  // Check if selected token is Solana
  const isSolanaSelected = useMemo(
    () =>
      selectedToken?.caipChainId === SolScope.Mainnet ||
      selectedToken?.caipChainId?.startsWith('solana:') ||
      false,
    [selectedToken],
  );

  // Initialize selected token from initial or priority token, fallback to mUSD
  // Only runs once on mount to avoid overwriting user selections from AssetSelectionBottomSheet
  useEffect(() => {
    if (hasInitialized) return;

    if (initialToken) {
      setSelectedToken(initialToken);
      setHasInitialized(true);
      return;
    }

    if (priorityToken) {
      const isPriorityTokenSolana =
        priorityToken?.caipChainId === SolScope.Mainnet ||
        priorityToken?.caipChainId?.startsWith('solana:');

      if (!isPriorityTokenSolana) {
        setSelectedToken(priorityToken);
        setHasInitialized(true);
        return;
      }
    }

    if (quickSelectTokens.length > 0) {
      const musdToken = quickSelectTokens.find(
        (qt) => qt.symbol.toUpperCase() === 'MUSD',
      )?.token;
      if (musdToken) {
        setSelectedToken(musdToken);
        setHasInitialized(true);
      }
    }
  }, [hasInitialized, initialToken, priorityToken, quickSelectTokens]);

  // Handle returned token from AssetSelectionBottomSheet
  useFocusEffect(
    useCallback(() => {
      const params = routeParams as
        | { returnedSelectedToken?: CardTokenAllowance }
        | undefined;
      if (params?.returnedSelectedToken) {
        setSelectedToken(params.returnedSelectedToken);
        setHasInitialized(true);
        navigation.setParams({
          returnedSelectedToken: undefined,
          selectedToken: undefined,
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
    if (isSolanaSelected) return false;
    if (limitType === 'restricted') {
      const num = parseFloat(customLimit);
      return customLimit !== '' && !isNaN(num) && num >= 0;
    }
    return true;
  }, [
    isOnboardingFlow,
    selectedToken,
    isSolanaSelected,
    limitType,
    customLimit,
  ]);

  // Handlers
  const handleQuickSelectToken = useCallback(
    (symbol: string) => {
      const quickSelectToken = quickSelectTokens.find(
        (qt) => qt.symbol.toUpperCase() === symbol.toUpperCase(),
      );
      if (quickSelectToken?.token) {
        const token = quickSelectToken.token;

        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
            .addProperties({
              action: CardActions.QUICK_SELECT_TOKEN_BUTTON,
              token_symbol: token.symbol,
              chain_id: token.caipChainId,
            })
            .build(),
        );

        setSelectedToken(token);
      }
    },
    [quickSelectTokens, trackEvent, createEventBuilder],
  );

  const handleOtherSelect = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({ action: CardActions.OTHER_TOKEN_BUTTON })
        .build(),
    );

    const { selectedToken: _excludedSelectedToken, ...restParams } =
      routeParams ?? {};

    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        tokensWithAllowances: allTokens ?? [],
        delegationSettings,
        cardExternalWalletDetails: externalWalletDetailsData,
        selectionOnly: true,
        hideSolanaAssets: true,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: restParams as Record<string, unknown>,
      }),
    );
  }, [
    navigation,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    trackEvent,
    createEventBuilder,
    routeParams,
  ]);

  const setCustomLimit = useCallback((value: string) => {
    // Sanitize: only numbers and single decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setCustomLimitState(formatted);
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

      // Wait for backend to process
      await new Promise((resolve) => setTimeout(resolve, 3000));
      dispatch(clearCacheData('card-external-wallet-details'));

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
    dispatch,
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
    quickSelectTokens,
    isOtherSelected,
    isLoading,

    // Handlers
    setSelectedToken,
    handleQuickSelectToken,
    handleOtherSelect,
    setLimitType,
    setCustomLimit,

    // Actions
    submit,
    cancel,
    skip,

    // Validation
    isValid,
    isSolanaSelected,

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
