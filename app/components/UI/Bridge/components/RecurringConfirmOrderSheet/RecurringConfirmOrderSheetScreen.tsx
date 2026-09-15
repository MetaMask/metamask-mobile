import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectBridgeBalanceRefreshKey,
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { BridgeQuoteDataProvider } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';

export const RecurringConfirmOrderSheetScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
    refreshKey: balanceRefreshKey,
  });

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
    <BridgeQuoteDataProvider
      latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
    >
      <RecurringConfirmOrderSheet
        latestSourceBalance={latestSourceBalance}
        onEditSlippagePress={handleEditSlippagePress}
        goBack={navigation.goBack}
      />
    </BridgeQuoteDataProvider>
  );
};
