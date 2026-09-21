import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  selectLimitOrderCostTolerance,
  selectLimitOrderMarketComparison,
} from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { LimitOrderConfirmationModal } from './LimitOrderConfirmationModal';
import type { LimitOrderConfirmationModalParams } from './types';
import { strings } from '../../../../../../locales/i18n';

export const LimitOrderConfirmationModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<LimitOrderConfirmationModalParams>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const triggerComparison = useSelector(selectLimitOrderMarketComparison);
  const delegationFee = useEIP7702UpgradeFee();
  const sourceChainId = params.sourceToken?.chainId;
  const feeToken = useMemo(
    () => (sourceChainId ? getNativeSourceToken(sourceChainId) : undefined),
    [sourceChainId],
  );

  const error = useMemo(() => {
    if (delegationFee.status === 'error') {
      return {
        bannerMessage: strings('bridge.limit.error_calculation_network_fees'),
        primaryButtonLabel: strings('bridge.limit.try_again'),
      };
    }
  }, [delegationFee]);

  const handleConfirm = useCallback(() => {
    if (delegationFee.status === 'error') {
      delegationFee.retry();
      return;
    }

    // STUB FOR LIMIT ORDER CREATION
    console.warn('Confirm limit order');
  }, [delegationFee]);

  return (
    <LimitOrderConfirmationModal
      {...params}
      triggerComparison={triggerComparison}
      delegationFee={delegationFee}
      feeToken={feeToken}
      costTolerance={`${costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE}%`}
      goBack={navigation.goBack}
      error={error?.bannerMessage}
      primaryButton={{
        onPress: handleConfirm,
        label:
          error?.primaryButtonLabel ?? strings('bridge.limit.confirm_order'),
        isLoading: delegationFee.status === 'loading',
      }}
    />
  );
};
