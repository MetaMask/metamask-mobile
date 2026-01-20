import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMetrics } from '../useMetrics';
import { RootState } from '../../../reducers';
import { useSignOut } from '../../../util/identity/hooks/useAuthentication';
import Routes from '../../../constants/navigation/Routes';
import { SuccessErrorSheetParams } from '../../Views/SuccessErrorSheet/interface';
import { useNavigation } from '../../../util/navigation/navUtils';
import { clearHistory } from '../../../actions/browser';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
import Logger from '../../../util/Logger';

const usePromptSeedlessRelogin = () => {
  const metrics = useMetrics();
  const dispatch = useDispatch();

  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  const [deleteWalletError, setDeleteWalletError] = useState<Error | null>(
    null,
  );

  const { signOut } = useSignOut();
  const navigation = useNavigation();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const navigateOnboardingRoot = useCallback((): void => {
    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          state: {
            routes: [
              {
                name: Routes.ONBOARDING.NAV,
                params: {
                  screen: Routes.ONBOARDING.ONBOARDING,
                  params: { delete: true },
                },
              },
            ],
          },
        },
      ],
    });
  }, [navigation]);

  const deleteWallet = useCallback(async () => {
    // reset wallet
    // redirect to login
    setIsDeletingInProgress(true);
    dispatch(
      clearHistory(metrics.isEnabled(), isDataCollectionForMarketingEnabled),
    );
    signOut();
    await Authentication.deleteWallet();
    navigateOnboardingRoot();
    setIsDeletingInProgress(false);
  }, [
    dispatch,
    metrics,
    isDataCollectionForMarketingEnabled,
    navigateOnboardingRoot,
    signOut,
  ]);

  const promptSeedlessRelogin = useCallback(() => {
    setDeleteWalletError(null);
    const errorSheetParams: SuccessErrorSheetParams = {
      type: 'error',
      title: strings('login.seedless_controller_error_prompt_title'),
      description: strings(
        'login.seedless_controller_error_prompt_description',
      ),
      primaryButtonLabel: strings(
        'login.seedless_controller_error_prompt_primary_button_label',
      ),
      onPrimaryButtonPress: () => {
        deleteWallet()
          .catch((error) => {
            Logger.error(error, 'Error during wallet deletion');
            setDeleteWalletError(error as Error);
            // prompt bottom sheet?
          })
          .finally(() => {
            setIsDeletingInProgress(false);
          });
      },
      closeOnPrimaryButtonPress: true,
    };
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: errorSheetParams,
    });
  }, [navigation, deleteWallet]);

  return { isDeletingInProgress, deleteWalletError, promptSeedlessRelogin };
};

export default usePromptSeedlessRelogin;
