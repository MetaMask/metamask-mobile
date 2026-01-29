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

  const handleTokenPress = useCallback(
    (token: BridgeToken) => {
      const isSourcePicker = type === TokenSelectorType.Source;
      const otherToken = isSourcePicker ? destToken : sourceToken;

      // Check if the selected token matches the "other" token
      const isSelectingOtherToken =
        otherToken &&
        token.address === otherToken.address &&
        token.chainId === otherToken.chainId;

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
    [type, sourceToken, destToken, dispatch, navigation],
  );

  const selectedToken =
    type === TokenSelectorType.Source ? sourceToken : destToken;

  return { handleTokenPress, selectedToken };
};
