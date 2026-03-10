import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { selectPredictPendingClaimByAddress } from '../selectors/predictController';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';
import { invalidatePredictCaches } from '../utils/invalidatePredictCaches';

/**
 * Orchestrates the claim flow (navigation, cache invalidation, toasts).
 * Not a data-fetching hook — does not wrap useQuery/useMutation.
 */
export const usePredictClaim = () => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const { claim: claimWinnings } = usePredictTrading();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '0x0';

  const claimBatchId = useSelector(
    selectPredictPendingClaimByAddress({ address: selectedAddress }),
  );
  const isClaimPending = !!claimBatchId;

  const claim = useCallback(async () => {
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

    try {
      navigateToConfirmation({
        headerShown: false,
        loader: ConfirmationLoader.PredictClaim,
        // TODO: remove once navigation stack is fixed properly
        stack: Routes.PREDICT.ROOT,
      });
      await claimWinnings({});

      invalidatePredictCaches(queryClient);
    } catch (err) {
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
    isClaimPending,
    claimWinnings,
    navigateToConfirmation,
    navigation,
    queryClient,
    toastRef,
    theme.colors.primary.default,
    theme.colors.error.default,
    theme.colors.accent04.normal,
  ]);

  return {
    claim,
    isClaimPending,
  };
};
