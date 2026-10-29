import { useCallback, useEffect } from 'react';
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
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeLimitOrderFeatureFlags } from '../../../../../selectors/bridge/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { TokenSelectorType } from '../../types';
import { MAX_INPUT_LENGTH } from '../../components/TokenInputArea';
import { useIsNetworkEnabled } from '../useIsNetworkEnabled';
import { useIsNetworkGasSponsored } from '../useIsNetworkGasSponsored';
import { useSourceAmountInput } from '../useSourceAmountInput';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import { useSwitchTokens } from '../useSwitchTokens';
import { normalizeSourceAmountToMaxLength } from '../../utils/normalizeSourceAmountToMaxLength';
import {
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

  useEffect(() => {
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

  // The API checks the order minimum at the live rate, so a fiat amount is
  // converted at that same rate for the amount entered to be the one checked.
  const sourceTokenFiatRate = useLiveTokenFiatRate(sourceToken);
  const sourceAmountInput = useSourceAmountInput({
    isFiatToggleEnabled,
    sourceAmount,
    sourceToken,
    tokenFiatRate: sourceTokenFiatRate,
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
