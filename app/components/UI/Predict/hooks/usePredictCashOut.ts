import { useContext, useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { PredictEventValues } from '../constants/eventNames';
import { usePredictActionGuard } from './usePredictActionGuard';
import { usePredictPreviewSheet } from '../contexts';
import type { PredictMarket, PredictPosition } from '../types';
import type { PredictNavigationParamList } from '../types/navigation';

interface UsePredictCashOutOptions {
  market: PredictMarket;
  callerName: string;
}

export const usePredictCashOut = ({
  market,
  callerName,
}: UsePredictCashOutOptions) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const { openSellSheet } = usePredictPreviewSheet();
  const { toastRef } = useContext(ToastContext);

  const onCashOut = useCallback(
    (position: PredictPosition) => {
      executeGuardedAction(
        () => {
          try {
            const outcome = market?.outcomes.find(
              (o) => o.id === position.outcomeId,
            );
            if (!outcome) {
              throw new Error(
                `Outcome not found for position ${position.id} (outcomeId: ${position.outcomeId})`,
              );
            }
            openSellSheet({
              market,
              position,
              outcome,
              entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
            });
          } catch (error) {
            Logger.error(error as Error, {
              component: callerName,
              positionId: position.id,
              outcomeId: position.outcomeId,
            });
            toastRef?.current?.showToast({
              variant: ToastVariants.Icon,
              iconName: IconName.Danger,
              labelOptions: [
                {
                  label: strings('predict.order.cashout_failed'),
                  isBold: true,
                },
              ],
              hasNoTimeout: false,
            });
          }
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
      );
    },
    [executeGuardedAction, market, openSellSheet, toastRef, callerName],
  );

  return { onCashOut };
};
