import { useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import {
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
} from '../../actions/settings';
import { ToastContext } from '../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastVariants,
} from '../../component-library/components/Toast/Toast.types';
import { IconName } from '../../component-library/components/Icons/Icon';
import Routes from '../../constants/navigation/Routes';
import NavigationService from '../../core/NavigationService';
import Logger from '../../util/Logger';
import type { RootState } from '../../reducers';
import { selectIsUnlocked } from '../../selectors/keyringController';
import {
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldShowBasicFunctionalityMigrationBottomSheet,
  selectShouldShowBasicFunctionalityMigrationToast,
} from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import {
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../selectors/settings';
import { strings } from '../../../locales/i18n';
import useThunkDispatch from './useThunkDispatch';

const selectCompletedOnboardingSafely = (state: RootState) =>
  state.onboarding?.completedOnboarding === true;

export function useBasicFunctionalityConsolidation(): void {
  const dispatch = useThunkDispatch();
  const { toastRef } = useContext(ToastContext);
  const isRunning = useRef(false);
  const hasPresentedBottomSheet = useRef(false);
  const hasPresentedToast = useRef(false);

  const isFlagEnabled = useSelector(selectMobileUxBftcConsolidationFlagEnabled);
  const isConsolidated = useSelector(
    selectIsBasicFunctionalityConsolidatedEnabled,
  );
  const isUnlocked = useSelector(selectIsUnlocked);
  const basicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const completedOnboarding = useSelector(selectCompletedOnboardingSafely);
  const shouldShowBottomSheet = useSelector(
    selectShouldShowBasicFunctionalityMigrationBottomSheet,
  );
  const shouldShowToast = useSelector(
    selectShouldShowBasicFunctionalityMigrationToast,
  );

  useEffect(() => {
    if (
      !isFlagEnabled ||
      isConsolidated ||
      !isUnlocked ||
      !completedOnboarding ||
      isRunning.current
    ) {
      return;
    }

    isRunning.current = true;
    dispatch(consolidateBasicFunctionality())
      .catch((error: unknown) => {
        Logger.error(
          error as Error,
          'useBasicFunctionalityConsolidation: Migration failed',
        );
      })
      .finally(() => {
        isRunning.current = false;
      });
  }, [
    completedOnboarding,
    dispatch,
    isConsolidated,
    isFlagEnabled,
    isUnlocked,
  ]);

  // Gating on `isUnlocked` keeps the notice off the lock screen. Clearing the
  // presented ref while locked lets it present once the wallet is unlocked.
  useEffect(() => {
    if (!shouldShowBottomSheet || !isUnlocked) {
      hasPresentedBottomSheet.current = false;
      return;
    }
    if (hasPresentedBottomSheet.current) {
      return;
    }

    hasPresentedBottomSheet.current = true;
    NavigationService.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY_MIGRATION,
    });
  }, [isUnlocked, shouldShowBottomSheet]);

  useEffect(() => {
    if (!shouldShowToast || !isUnlocked) {
      hasPresentedToast.current = false;
      return;
    }
    if (hasPresentedToast.current || !toastRef?.current) {
      return;
    }

    const dismissToast = () => {
      dispatch(dismissBasicFunctionalityMigrationNotification());
      toastRef.current?.closeToast();
    };

    hasPresentedToast.current = true;
    toastRef.current.showToast({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [
        {
          label: strings('basic_functionality_migration.title'),
          isBold: true,
        },
      ],
      descriptionOptions: {
        // The migration has already persisted the landing state by the time the
        // toast presents, so the copy must follow it rather than assume "on".
        description: basicFunctionalityEnabled
          ? strings('basic_functionality_migration.toast_description')
          : strings('basic_functionality_migration.toast_description_disabled'),
      },
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: dismissToast,
      },
      linkButtonOptions: {
        label: strings('basic_functionality_migration.settings_link'),
        onPress: () => {
          dismissToast();
          NavigationService.navigation.navigate(Routes.SETTINGS_VIEW, {
            screen: Routes.SETTINGS.SECURITY_SETTINGS,
          });
        },
      },
    });
  }, [
    basicFunctionalityEnabled,
    dispatch,
    isUnlocked,
    shouldShowToast,
    toastRef,
  ]);
}
