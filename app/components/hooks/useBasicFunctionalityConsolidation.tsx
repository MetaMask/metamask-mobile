import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Text,
  TextButton,
  TextColor,
  TextVariant,
  toast,
} from '@metamask/design-system-react-native';

import {
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
} from '../../actions/settings';
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
import { useAnalytics } from './useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../core/Analytics';

const BF_MIXED_TOAST_NOTICE_NAME = 'bf_mixed_toast';

export enum BasicFunctionalityMixedToastAction {
  VIEWED = 'viewed',
  OPEN_SETTINGS = 'open settings',
  DISMISS = 'dismiss',
}

export const selectCompletedOnboardingSafely = (state: RootState) =>
  state.onboarding?.completedOnboarding === true;

export function useBasicFunctionalityConsolidation(): void {
  const dispatch = useThunkDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isRunning = useRef(false);
  const hasPresentedBottomSheet = useRef(false);
  const hasPresentedToast = useRef(false);
  const toastCtaAction = useRef<BasicFunctionalityMixedToastAction | null>(
    null,
  );

  const trackMixedToastNotice = useCallback(
    (action: BasicFunctionalityMixedToastAction) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED)
          .addProperties({
            name: BF_MIXED_TOAST_NOTICE_NAME,
            action,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

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

  // `completedOnboarding` flips to true while the wallet is still being created
  // (Authentication.dispatchLogin), long before finalizeOnboardingCompletion
  // enrols the new wallet in the cohort. App renders under PersistGate, so an
  // existing wallet never reads false here; latching a false read marks this as
  // an onboarding session and keeps the newly created wallet off the
  // existing-wallet migration path, which would otherwise show it a notice.
  const isOnboardingSession = useRef(false);
  if (!completedOnboarding) {
    isOnboardingSession.current = true;
  }

  useEffect(() => {
    if (
      !isFlagEnabled ||
      isConsolidated ||
      !isUnlocked ||
      !completedOnboarding ||
      isOnboardingSession.current ||
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
      // Hide the overlay without acknowledging the notice. The DS Toaster sits
      // in FullWindowOverlay above native-stack screens, so leaving it up would
      // keep the Settings link tappable on the lock screen.
      if (hasPresentedToast.current) {
        toast.dismiss();
      }
      hasPresentedToast.current = false;
      return;
    }
    if (hasPresentedToast.current) {
      return;
    }

    const dismissNotification = () => {
      dispatch(dismissBasicFunctionalityMigrationNotification());
    };

    hasPresentedToast.current = true;
    toastCtaAction.current = null;
    trackMixedToastNotice(BasicFunctionalityMixedToastAction.VIEWED);
    toast({
      hasNoTimeout: true,
      title: strings('basic_functionality_migration.title'),
      // A node rather than a string so the settings link flows inline with the
      // sentence instead of sitting below it as a separate action button.
      description: (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {/* The migration has already persisted the landing state by the time
          the toast presents, so the copy must follow it rather than assume "on". */}
          {basicFunctionalityEnabled
            ? strings('basic_functionality_migration.toast_description')
            : strings(
                'basic_functionality_migration.toast_description_disabled',
              )}{' '}
          <TextButton
            variant={TextVariant.BodySm}
            onPress={() => {
              toastCtaAction.current =
                BasicFunctionalityMixedToastAction.OPEN_SETTINGS;
              trackMixedToastNotice(
                BasicFunctionalityMixedToastAction.OPEN_SETTINGS,
              );
              dismissNotification();
              toast.dismiss();
              NavigationService.navigation.navigate(Routes.SETTINGS_VIEW, {
                screen: Routes.SETTINGS.SECURITY_SETTINGS,
              });
            }}
          >
            {strings('basic_functionality_migration.settings_link')}
          </TextButton>
        </Text>
      ),
      onClose: () => {
        // Opening Settings also dismisses the toast; only count a plain close
        // as dismiss so we do not double-fire against the CTA action.
        if (
          toastCtaAction.current !==
          BasicFunctionalityMixedToastAction.OPEN_SETTINGS
        ) {
          trackMixedToastNotice(BasicFunctionalityMixedToastAction.DISMISS);
        }
        toastCtaAction.current = null;
        dismissNotification();
      },
    });
  }, [
    basicFunctionalityEnabled,
    dispatch,
    isUnlocked,
    shouldShowToast,
    trackMixedToastNotice,
  ]);
}
