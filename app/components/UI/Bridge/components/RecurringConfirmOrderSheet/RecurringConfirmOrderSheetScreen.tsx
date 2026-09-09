import React, { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  incrementBridgeBalanceRefreshKey,
  resetBridgeTokenInputs,
  selectBridgeBalanceRefreshKey,
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { BridgeQuoteDataProvider } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import {
  showRecurringAutoUpgradeError,
  submitRecurringOrder,
} from './RecurringConfirmOrderSheet.utils';

export const RecurringConfirmOrderSheetScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);
  const autoUpgradeEIP7702Account = useAutoUpgradeEIP7702Account();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
    refreshKey: balanceRefreshKey,
  });

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await autoUpgradeEIP7702Account();
      await submitRecurringOrder();
      dispatch(resetBridgeTokenInputs());
      Engine.context.BridgeController?.resetState?.();
      dispatch(incrementBridgeBalanceRefreshKey());
      navigation.goBack();
    } catch (error) {
      showRecurringAutoUpgradeError(error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [autoUpgradeEIP7702Account, dispatch, navigation]);

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
        isSubmitting={isSubmitting}
        latestSourceBalance={latestSourceBalance}
        onConfirm={handleConfirm}
        onEditSlippagePress={handleEditSlippagePress}
        goBack={navigation.goBack}
      />
    </BridgeQuoteDataProvider>
  );
};
