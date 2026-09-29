import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  setDestToken,
  setSourceAmount,
  setSourceAmountAsMax,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeLimitOrderFeatureFlags } from '../../../../../selectors/bridge/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { TokenSelectorType } from '../../types';
import { MAX_INPUT_LENGTH } from '../../components/TokenInputArea';
import { useIsNetworkEnabled } from '../useIsNetworkEnabled';
import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSourceAmountInput } from '../useSourceAmountInput';
import { useSwitchTokens } from '../useSwitchTokens';
import { normalizeSourceAmountToMaxLength } from '../../utils/normalizeSourceAmountToMaxLength';
import {
  getDefaultTokenPairForChains,
  getDefaultDestToken,
  getNativeSourceToken,
} from '../../utils/tokenUtils';
import { areAddressesEqual } from '../../../../../util/address';
import { useBridgeSession } from '../useBridgeSession';

export const useLimitOrderSwapInputs = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();

  const limitOrderFeatureFlags = useSelector(
    selectBridgeLimitOrderFeatureFlags,
  );
  const enabledChainIds = limitOrderFeatureFlags?.enabledChainIds;

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
  const didResetTokensRef = useRef(false);

  useEffect(() => {
    didResetTokensRef.current = false;

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
    didResetTokensRef.current = true;
  }, [enabledChainIds, dispatch]);

  useEffect(() => {
    if (didResetTokensRef.current) {
      // Avoid overwriting the freshly reset dest token with one computed from stale data.
      didResetTokensRef.current = false;
      return;
    }

    if (!sourceToken?.chainId || !destToken?.chainId) {
      return;
    }
    const sourceChainCaip = formatChainIdToCaip(sourceToken.chainId);
    const destChainCaip = formatChainIdToCaip(destToken.chainId);
    if (sourceChainCaip === destChainCaip) {
      return;
    }
    // Limit orders don't support cross-chain trades, so a stale
    // cross-chain dest must always be corrected, even if the user
    // manually picked it earlier on the previous source chain.
    const defaultDestToken = getDefaultDestToken(sourceToken.chainId);
    const nativeToken = getNativeSourceToken(sourceToken.chainId);
    const nextDestToken =
      defaultDestToken &&
      !areAddressesEqual(sourceToken.address, defaultDestToken.address)
        ? defaultDestToken
        : nativeToken;
    dispatch(setDestToken(nextDestToken));
  }, [sourceToken, destToken, dispatch]);

  const { latestSourceBalance } = useBridgeSession();

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

  const { handleSwitchTokens } = useSwitchTokens();
  const isDestNetworkEnabled = useIsNetworkEnabled(destToken?.chainId);
  const isSourceNetworkGasSponsored = useIsNetworkGasSponsored(
    sourceToken?.chainId,
  );

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

  const handleFlipTokensPress = useCallback(
    (destTokenAmount?: string) => {
      resetToTokenMode();
      handleSwitchTokens(destTokenAmount)().catch((error) => {
        console.error('Error switching swap tokens:', error);
      });
    },
    [handleSwitchTokens, resetToTokenMode],
  );

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
      enabledChainIds: sourceToken?.chainId
        ? [formatChainIdToCaip(sourceToken.chainId)]
        : [],
      excludeRwaTokens: true,
    });
  }, [navigation, sourceToken?.chainId]);

  return {
    enabledChainIds,
    destToken,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    handleSourceTokenPress,
    isFlipDisabled: !sourceToken || !destToken || !isDestNetworkEnabled,
    sourceAmount,
    isSourceNetworkGasSponsored,
    sourceAmountInput,
    sourceToken,
  };
};
