import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  setSourceToken,
  setDestToken,
  selectSourceToken,
  selectDestToken,
} from '../../../../core/redux/slices/bridge';
import { BridgeToken, TokenSelectorType } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import { useRWAToken } from './useRWAToken';

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

  const handleTokenPress = useCallback(
    async (token: BridgeToken) => {
      const isSourcePicker = type === TokenSelectorType.Source;
      const otherToken = isSourcePicker ? destToken : sourceToken;

      // Check if the selected token matches the "other" token
      const isSelectingOtherToken =
        otherToken &&
        token.address === otherToken.address &&
        token.chainId === otherToken.chainId;

      if (isStockToken(token)) {
        const isTradingOpen = await isTokenTradingOpen(token);
        if (!isTradingOpen) {
          // Show market closed bottom sheet
          navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
            screen: Routes.BRIDGE.MODALS.MARKET_CLOSED_MODAL,
          });
          return;
        }
      }

      if (isSelectingOtherToken && sourceToken && destToken) {
        // Swap the tokens: old source becomes dest, old dest becomes source
        dispatch(setSourceToken(destToken));
        dispatch(setDestToken(sourceToken));
      } else {
        // Normal selection: just update the current token
        dispatch(isSourcePicker ? setSourceToken(token) : setDestToken(token));
      }

      navigation.goBack();
    },
    [
      type,
      destToken,
      sourceToken,
      isStockToken,
      navigation,
      isTokenTradingOpen,
      dispatch,
    ],
  );

  const selectedToken =
    type === TokenSelectorType.Source ? sourceToken : destToken;

  return { handleTokenPress, selectedToken };
};
