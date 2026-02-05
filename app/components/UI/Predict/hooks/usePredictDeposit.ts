import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';

interface UsePredictDepositParams {
  providerId?: string;
}

export const usePredictDeposit = ({
  providerId = 'polymarket',
}: UsePredictDepositParams = {}) => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';

  const { deposit: depositWithConfirmation } = usePredictTrading();

  const depositBatchId = useSelector(
    selectPredictPendingDepositByAddress({
      providerId,
      address: selectedInternalAccountAddress,
    }),
  );

  const deposit = useCallback(async () => {
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
      });

      depositWithConfirmation({
        providerId,
      }).catch((err) => {
        console.error('Failed to initialize deposit:', err);

        // Log error with deposit initialization context
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictDeposit',
          },
          context: {
            name: 'usePredictDeposit',
            data: {
              method: 'deposit',
              action: 'deposit_initialization',
              operation: 'financial_operations',
              providerId,
            },
          },
        });
        navigation.goBack();
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('predict.deposit.error_title'), isBold: true },
            { label: '\n', isBold: false },
            {
              label: strings('predict.deposit.error_description'),
              isBold: false,
            },
          ],
          iconName: IconName.Error,
          iconColor: theme.colors.error.default,
          backgroundColor: theme.colors.accent04.normal,
          hasNoTimeout: false,
          linkButtonOptions: {
            label: strings('predict.deposit.try_again'),
            onPress: () => deposit(),
          },
        });
      });
    } catch (err) {
      console.error('Failed to proceed with deposit:', err);
      navigation.goBack();
      // Re-throw to allow testing of this error path
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.deposit.error_title'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.deposit.error_description'),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
        linkButtonOptions: {
          label: strings('predict.deposit.try_again'),
          onPress: () => deposit(),
        },
      });

      // Log error with deposit navigation context
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictDeposit',
        },
        context: {
          name: 'usePredictDeposit',
          data: {
            method: 'deposit',
            action: 'deposit_navigation',
            operation: 'financial_operations',
            providerId,
          },
        },
      });
    }
  }, [
    depositWithConfirmation,
    navigateToConfirmation,
    navigation,
    providerId,
    theme.colors.accent04.normal,
    theme.colors.error.default,
    toastRef,
  ]);

  return {
    deposit,
    isDepositPending: !!depositBatchId,
  };
};
