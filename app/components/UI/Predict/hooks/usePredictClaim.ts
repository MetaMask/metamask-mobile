import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import {
  PredictEventValues,
  PredictTradeStatus,
} from '../constants/eventNames';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { selectPredictPendingClaimByAddress } from '../selectors/predictController';
import type { PredictTradeAnalyticsProperties } from '../types';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { mapClaimFailureReason } from '../utils/analytics';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';

export const usePredictClaim = () => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const { claim: claimWinnings } = usePredictTrading();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation();

  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '';

  const claimBatchId = useSelector((state: RootState) =>
    selectPredictPendingClaimByAddress(state, selectedAddress),
  );
  const isClaimPending = !!claimBatchId;

  const claim = useCallback(
    async (analyticsContext?: PredictTradeAnalyticsProperties) => {
      const analyticsProperties: PredictTradeAnalyticsProperties = {
        ...analyticsContext,
        transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_CLAIM,
      };

      if (isClaimPending) {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('predict.claim.toasts.in_progress.title'),
              isBold: true,
            },
          ],
          iconName: IconName.Info,
          iconColor: theme.colors.primary.default,
          hasNoTimeout: false,
        });
        return;
      }

      // Fire the `attempted` (initiated) event once for every claim entry point.
      Engine.context.PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties,
      });

      try {
        navigateToConfirmation({
          headerShown: false,
          loader: ConfirmationLoader.PredictClaim,
          // TODO: remove once navigation stack is fixed properly
          stack: Routes.PREDICT.ROOT,
        });
        await claimWinnings({ analyticsProperties });
      } catch (err) {
        // Synchronous/submission failures occur before any on-chain
        // transaction is created, so the controller's terminal-status handler
        // never runs. Track the failure here so pre-tx failures are measured.
        Engine.context.PredictController.trackPredictOrderEvent({
          status: PredictTradeStatus.FAILED,
          analyticsProperties,
          failureReason: mapClaimFailureReason(err),
        });

        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictClaim',
          },
          context: {
            name: 'usePredictClaim',
            data: {
              method: 'claim',
              action: 'claim_winnings',
              operation: 'position_management',
            },
          },
        });

        navigation.goBack();

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('predict.claim.toasts.error.title'),
              isBold: true,
            },
            { label: '\n', isBold: false },
            {
              label: strings('predict.claim.toasts.error.description'),
              isBold: false,
            },
          ],
          iconName: IconName.Error,
          iconColor: theme.colors.error.default,
          backgroundColor: theme.colors.accent04.normal,
          hasNoTimeout: false,
          linkButtonOptions: {
            label: strings('predict.claim.toasts.error.try_again'),
            onPress: () => {
              claim(analyticsContext);
            },
          },
        });
      }
    },
    [
      isClaimPending,
      toastRef,
      theme.colors.primary.default,
      theme.colors.error.default,
      theme.colors.accent04.normal,
      navigateToConfirmation,
      claimWinnings,
      navigation,
    ],
  );

  return {
    claim,
    isClaimPending,
  };
};
