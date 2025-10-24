import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { captureException } from '@sentry/react-native';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { usePredictTrading } from './usePredictTrading';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { useNavigation } from '@react-navigation/native';

interface UsePredictClaimParams {
  providerId?: string;
}

export const usePredictClaim = ({
  providerId = POLYMARKET_PROVIDER_ID,
}: UsePredictClaimParams = {}) => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const { claim: claimWinnings } = usePredictTrading();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation();

  const selectClaimTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.claimTransaction,
  );
  const claimTransaction = useSelector(selectClaimTransaction);

  const claim = useCallback(async () => {
    try {
      navigateToConfirmation({
        headerShown: false,
        stack: Routes.PREDICT.ROOT,
      });
      await claimWinnings({ providerId });
    } catch (err) {
      // Capture exception with claim context
      captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: {
          component: 'usePredictClaim',
          action: 'claim_winnings',
          operation: 'position_management',
        },
        extra: {
          claimContext: {
            providerId,
          },
        },
      });

      navigation.goBack();

      // Show error toast with retry option
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.claim.toasts.error.title'), isBold: true },
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
            claim();
          },
        },
      });
    }
  }, [
    claimWinnings,
    navigateToConfirmation,
    navigation,
    providerId,
    theme.colors.accent04.normal,
    theme.colors.error.default,
    toastRef,
  ]);

  return {
    claim,
    status: claimTransaction?.status,
  };
};
