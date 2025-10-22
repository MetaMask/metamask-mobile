import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictTrading } from './usePredictTrading';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';

interface UsePredictClaimParams {
  providerId?: string;
}

export const usePredictClaim = ({
  providerId = POLYMARKET_PROVIDER_ID,
}: UsePredictClaimParams = {}) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { claim: claimWinnings } = usePredictTrading();
  const { isEligible } = usePredictEligibility({
    providerId,
  });
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);

  const selectClaimTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.claimTransaction,
  );
  const claimTransaction = useSelector(selectClaimTransaction);

  const claim = useCallback(async () => {
    if (!isEligible) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      return;
    }
    try {
      navigateToConfirmation({
        headerShown: false,
        stack: Routes.PREDICT.ROOT,
      });
      await claimWinnings({ providerId });
    } catch (err) {
      console.error('Failed to proceed with claim:', err);
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
    isEligible,
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
