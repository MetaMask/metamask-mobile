import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  setDestToken,
  setSourceAmount,
  setSourceAmountAsMax,
  setSourceToken,
} from '../../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyFeatureFlags } from '../../../../../../selectors/bridge/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../../../selectors/featureFlagController';
import { TokenSelectorType } from '../../../types';
import { MAX_INPUT_LENGTH } from '../../../components/TokenInputArea';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeQuoteRequest } from '../../../hooks/useBridgeQuoteRequest';
import { useIsHardwareWalletForBridge } from '../../../hooks/useIsHardwareWalletForBridge';
import { useIsNetworkEnabled } from '../../../hooks/useIsNetworkEnabled';
import { useIsNetworkGasSponsored } from '../../../hooks/useIsNetworkGasSponsored';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { useSourceAmountInput } from '../../../hooks/useSourceAmountInput';
import { useSwitchTokens } from '../../../hooks/useSwitchTokens';
import { normalizeSourceAmountToMaxLength } from '../../../utils/normalizeSourceAmountToMaxLength';
import { getDefaultTokenPairForChains } from '../../../utils/tokenUtils';

interface UseRecurringBuySwapInputsOptions {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

export const useRecurringBuySwapInputs = ({
  latestSourceBalance,
}: UseRecurringBuySwapInputsOptions) => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();

  const recurringBuyFeatureFlags = useSelector(
    selectBridgeRecurringBuyFeatureFlags,
  );
  const enabledChainIds = recurringBuyFeatureFlags?.enabledChainIds;

  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const isFiatToggleEnabled = useSelector(
    (state: RootState) =>
      selectRemoteFeatureFlags(state).enableFiatToggle === true,
  );

  // The view is unmounted/remounted each time its tab is switched away
  // from/back to (see BridgeView's conditional rendering), so this effect runs
  // exactly once per "switch into this tab" event as long as enabledChainIds is
  // a stable reference (which is based on LD flags).
  // sourceToken/destToken are shared bridge-wide Redux state and can be left
  // over from another flow (e.g. Market order) whose chain isn't part of this
  // flow's allowed chains, so always re-anchor both to this flow's default
  // pair: Ethereum's ETH/mUSD when enabled, otherwise the default pair for the
  // first enabled chain.
  useEffect(() => {
    if (!enabledChainIds) {
      return;
    }

    const defaultPair = getDefaultTokenPairForChains(enabledChainIds);
    if (!defaultPair) {
      return;
    }

    dispatch(setSourceToken(defaultPair.sourceToken));
    if (defaultPair.destToken) {
      dispatch(setDestToken(defaultPair.destToken));
    }
  }, [enabledChainIds, dispatch]);

  const handleSourceAmountChange = useCallback(
    (value: string | undefined) => {
      dispatch(setSourceAmount(value));
    },
    [dispatch],
  );

  const sourceAmountInput = useSourceAmountInput({
    isFiatToggleEnabled,
    sourceAmount,
    sourceToken,
    onSourceAmountChange: handleSourceAmountChange,
  });
  const { resetToTokenMode, syncFiatAmountToTokenAmount } = sourceAmountInput;

  const { destTokenAmount, isLoading } = useBridgeQuoteDataContext();
  const { handleSwitchTokens } = useSwitchTokens();
  const isDestNetworkEnabled = useIsNetworkEnabled(destToken?.chainId);
  const isSourceNetworkGasSponsored = useIsNetworkGasSponsored(
    sourceToken?.chainId,
  );

  // Gas sponsorship only covers trades that stay on a single sponsored chain.
  const isQuoteSponsored =
    Boolean(sourceToken?.chainId) &&
    sourceToken?.chainId === destToken?.chainId &&
    isSourceNetworkGasSponsored;

  const updateQuoteParams = useBridgeQuoteRequest({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  // A recurring buy can't be signed by a hardware wallet on any chain, so no
  // quote is ever requested for one. The inputs stay interactive and
  // `HardwareWalletUnsupportedBanner` explains why no quote appears. Gating
  // here rather than in useBridgeQuoteRequest keeps hardware wallets working
  // for Market orders, which share that hook but not this one.
  const isHardwareWallet = useIsHardwareWalletForBridge();

  // Both pickers are restricted to EVM chains, so no destination address is
  // needed: that is only required for bridges involving a non-EVM chain.
  const hasValidBridgeInputs =
    !isHardwareWallet &&
    sourceAmount !== undefined &&
    sourceAmount !== '.' &&
    Boolean(sourceToken?.decimals) &&
    Boolean(destToken);

  useEffect(() => {
    if (hasValidBridgeInputs) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [hasValidBridgeInputs, updateQuoteParams]);

  const handleSourceMaxPress = useCallback(() => {
    if (!latestSourceBalance?.displayBalance) {
      return;
    }
    const cleaned = normalizeSourceAmountToMaxLength(
      latestSourceBalance.displayBalance,
      MAX_INPUT_LENGTH,
    );
    syncFiatAmountToTokenAmount(cleaned);
    dispatch(setSourceAmountAsMax(cleaned));
  }, [
    dispatch,
    latestSourceBalance?.displayBalance,
    syncFiatAmountToTokenAmount,
  ]);

  const handleSourcePresetAmountSelect = useCallback(
    (value: string) => {
      // Quick-pick presets replace the full amount rather than editing at the
      // current cursor position, so clear the cursor state before updating.
      const normalizedValue =
        normalizeSourceAmountToMaxLength(value, MAX_INPUT_LENGTH) || undefined;
      syncFiatAmountToTokenAmount(normalizedValue);
      dispatch(setSourceAmount(normalizedValue));
    },
    [dispatch, syncFiatAmountToTokenAmount],
  );

  const handleFlipTokensPress = useCallback(() => {
    resetToTokenMode();
    handleSwitchTokens(destTokenAmount)().catch((error) => {
      console.error('Error switching swap tokens:', error);
    });
  }, [destTokenAmount, handleSwitchTokens, resetToTokenMode]);

  const handleSourceTokenPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: TokenSelectorType.Source,
      enabledChainIds,
      excludeRwaTokens: true,
    });
  }, [enabledChainIds, navigation]);

  const handleDestTokenPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: TokenSelectorType.Dest,
      enabledChainIds,
      excludeRwaTokens: true,
    });
  }, [enabledChainIds, navigation]);

  return {
    enabledChainIds,
    destToken,
    destTokenAmount,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    handleSourceTokenPress,
    isDestAmountLoading: isLoading,
    isFlipDisabled: !sourceToken || !destToken || !isDestNetworkEnabled,
    isQuoteSponsored,
    sourceAmount,
    sourceAmountInput,
    sourceToken,
  };
};
