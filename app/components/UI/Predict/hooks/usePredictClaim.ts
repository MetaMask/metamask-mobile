import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';

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

  const claim = useCallback(async () => {
    try {
      navigateToConfirmation({
        headerShown: false,
        loader: ConfirmationLoader.PredictClaim,
        // TODO: remove once navigation stack is fixed properly
        stack: Routes.PREDICT.ROOT,
      });
      await claimWinnings({ providerId });
    } catch (err) {
      // Log error with claim context
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
  };
};
