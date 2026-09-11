import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';

export const RecurringConfirmOrderSheetScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  const handleEditSlippagePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

  return (
    <RecurringConfirmOrderSheet
      onEditSlippagePress={handleEditSlippagePress}
      goBack={navigation.goBack}
    />
  );
};
