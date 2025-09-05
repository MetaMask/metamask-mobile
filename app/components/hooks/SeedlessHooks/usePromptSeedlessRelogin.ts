import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMetrics } from '../useMetrics';
import { RootState } from '../../../reducers';
import { useSignOut } from '../../../util/identity/hooks/useAuthentication';
import Routes from '../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { SuccessErrorSheetParams } from '../../Views/SuccessErrorSheet/interface';
import storageWrapper from '../../../store/storage-wrapper';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import { clearHistory } from '../../../actions/browser';
import { strings } from '../../../../locales/i18n';
import { setCompletedOnboarding } from '../../../actions/onboarding';
import { useDeleteWallet } from '../DeleteWallet';

const usePromptSeedlessRelogin = () => {
  const metrics = useMetrics();
  const dispatch = useDispatch();
  const [resetWalletState, deleteUser] = useDeleteWallet();

  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);

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

  const promptSeedlessRelogin = useCallback(() => {
    const errorSheetParams: SuccessErrorSheetParams = {
      type: 'error',
      title: strings('login.seedless_controller_error_prompt_title'),
      description: strings(
        'login.seedless_controller_error_prompt_description',
      ),
      primaryButtonLabel: strings(
        'login.seedless_controller_error_prompt_primary_button_label',
      ),
      onPrimaryButtonPress: async () => {
        // reset wallet
        // redirect to login
        setIsDeletingInProgress(true);
        dispatch(
          clearHistory(
            metrics.isEnabled(),
            isDataCollectionForMarketingEnabled,
          ),
        );
        signOut();
        await resetWalletState();
        await deleteUser();
        await storageWrapper.removeItem(OPTIN_META_METRICS_UI_SEEN);
        dispatch(setCompletedOnboarding(false));
        navigateOnboardingRoot();
        setIsDeletingInProgress(false);
      },
      closeOnPrimaryButtonPress: true,
    };
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: errorSheetParams,
    });
  }, [
    dispatch,
    isDataCollectionForMarketingEnabled,
    metrics,
    navigateOnboardingRoot,
    navigation,
    resetWalletState,
    signOut,
    deleteUser,
  ]);

  return { isDeletingInProgress, promptSeedlessRelogin };
};

export default usePromptSeedlessRelogin;
