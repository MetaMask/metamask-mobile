import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  setSourceToken,
  setDestToken,
  selectSourceToken,
  selectDestToken,
  selectDestAmount,
  setIsDestTokenManuallySet,
} from '../../../../core/redux/slices/bridge';
import { BridgeToken, TokenSelectorType } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import { useRWAToken } from './useRWAToken';
import { useSwitchTokens } from './useSwitchTokens';
import { useIsNetworkEnabled } from './useIsNetworkEnabled';
import { useAutoUpdateDestToken } from './useAutoUpdateDestToken';

/**
 * Hook to manage token selection logic for Bridge token selector
 * Handles both normal selection and token swapping when selecting the opposite token
 * @param type - Whether this is a source or dest token selector
 */
export const useTokenSelection = (type: TokenSelectorType) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const { isStockToken, isTokenTradingOpen } = useRWAToken();
  const destAmount = useSelector(selectDestAmount);
  const { handleSwitchTokens } = useSwitchTokens();
  const isDestNetworkEnabled = useIsNetworkEnabled(destToken?.chainId);
  const { autoUpdateDestToken } = useAutoUpdateDestToken();

  const handleTokenPress = useCallback(
    async (token: BridgeToken) => {
      const isSourcePicker = type === TokenSelectorType.Source;
      const otherToken = isSourcePicker ? destToken : sourceToken;

      // Check if the selected token matches the "other" token
      const isSelectingOtherToken =
        otherToken &&
        token.address === otherToken.address &&
        token.chainId === otherToken.chainId;

      if (isStockToken(token) && !isTokenTradingOpen(token)) {
        // Show market closed bottom sheet
        navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
        });
        return;
      }

      if (isSelectingOtherToken && sourceToken && destToken) {
        // Only allow swap if the destination network (which would become source) is enabled
        if (!isDestNetworkEnabled) {
          // Cannot swap - dest network is disabled, just go back
          navigation.goBack();
          return;
        }

        // Swap the tokens: old source becomes dest, old dest becomes source
        // Pass destAmount so it becomes the new sourceAmount after swap
        try {
          await handleSwitchTokens(destAmount)();
        } catch {
          // Network switch failed - still navigate back but state may be inconsistent
          // The user can retry from the main view
        }
      } else {
        // Normal selection: just update the current token
        dispatch(isSourcePicker ? setSourceToken(token) : setDestToken(token));
        if (!isSourcePicker) {
          dispatch(setIsDestTokenManuallySet(true));
        } else {
          // Auto-update dest token when source token changes
          autoUpdateDestToken(token);
        }
      }

      navigation.goBack();
    },
    [
      type,
      destToken,
      sourceToken,
      isStockToken,
      isTokenTradingOpen,
      destAmount,
      dispatch,
      navigation,
      handleSwitchTokens,
      isDestNetworkEnabled,
      autoUpdateDestToken,
    ],
  );

  const selectedToken =
    type === TokenSelectorType.Source ? sourceToken : destToken;

  return { handleTokenPress, selectedToken };
};
