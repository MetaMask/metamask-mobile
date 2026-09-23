import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import Logger from '../../../../../util/Logger';
import {
  selectLimitOrderCostTolerance,
  selectLimitOrderMarketComparison,
} from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { useFetchLimitOrdersDelegations } from '../../api/limitOrders/getDelegations';
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

  const [hasDelegationsError, setHasDelegationsError] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { fetchLimitOrdersDelegations } = useFetchLimitOrdersDelegations({
    ...params.order,
    costTolerance: costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE,
  });

  const error = useMemo(() => {
    if (delegationFee.status === 'error') {
      return {
        bannerMessage: strings('bridge.limit.error_calculation_network_fees'),
        primaryButtonLabel: strings('bridge.limit.try_again'),
      };
    }

    if (hasDelegationsError) {
      return {
        bannerMessage: strings('bridge.limit.error_fetching_delegations'),
        primaryButtonLabel: strings('bridge.limit.try_again'),
      };
    }
  }, [delegationFee, hasDelegationsError]);

  const handleConfirm = useCallback(async () => {
    if (delegationFee.status === 'error') {
      delegationFee.retry();
      return;
    }

    setHasDelegationsError(false);
    setIsCreatingOrder(true);

    try {
      const delegations = await fetchLimitOrdersDelegations();

      // STUB FOR LIMIT ORDER CREATION: the delegations still need to be
      // signed and submitted.
      console.warn('Limit order delegations', delegations);
    } catch (fetchError) {
      Logger.error(
        fetchError as Error,
        'LimitOrderConfirmationModalScreen: Failed to fetch limit order delegations',
      );
      setHasDelegationsError(true);
    } finally {
      setIsCreatingOrder(false);
    }
  }, [delegationFee, fetchLimitOrdersDelegations]);

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
        isLoading: delegationFee.status === 'loading' || isCreatingOrder,
      }}
    />
  );
};
