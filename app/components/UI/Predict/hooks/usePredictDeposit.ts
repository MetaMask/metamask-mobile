import { NavigationProp, useNavigation } from '@react-navigation/native';
import { captureException } from '@sentry/react-native';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useAppThemeFromContext } from '../../../../util/theme';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictTrading } from './usePredictTrading';

interface UsePredictDepositParams {
  providerId?: string;
}

export const usePredictDeposit = ({
  providerId = 'polymarket',
}: UsePredictDepositParams = {}) => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const { deposit: depositWithConfirmation } = usePredictTrading();

  const isDepositPending = useSelector(
    selectPredictPendingDepositByAddress({
      providerId,
      address: selectedInternalAccountAddress ?? '',
    }),
  );

  const deposit = useCallback(async () => {
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PREDICT.ROOT,
      });

      depositWithConfirmation({
        providerId,
      }).catch((err) => {
        console.error('Failed to initialize deposit:', err);

        // Capture exception with deposit initialization context
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePredictDeposit',
            action: 'deposit_initialization',
            operation: 'financial_operations',
          },
          extra: {
            depositContext: {
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

      // Capture exception with deposit navigation context
      captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: {
          component: 'usePredictDeposit',
          action: 'deposit_navigation',
          operation: 'financial_operations',
        },
        extra: {
          depositContext: {
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
    isDepositPending,
  };
};
