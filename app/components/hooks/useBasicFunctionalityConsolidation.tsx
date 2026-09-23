import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
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
  selectIsExistingSocialWalletRestore,
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldRepairSocialLoginBasicFunctionality,
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
  const isHidingToastWithoutAck = useRef(false);
  const hasAcknowledgedToast = useRef(false);

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
  const isExistingSocialWalletRestore = useSelector(
    selectIsExistingSocialWalletRestore,
  );
  const shouldRepairSocialLoginBasicFunctionality = useSelector(
    selectShouldRepairSocialLoginBasicFunctionality,
  );
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
  //
  // Social rehydration also reads false while restoring, but it hands back a
  // wallet that already exists and is never enrolled by onboarding, so release
  // the latch and migrate it in the same session instead of the next launch.
  const isOnboardingSession = useRef(false);
  if (isExistingSocialWalletRestore) {
    isOnboardingSession.current = false;
  } else if (!completedOnboarding) {
    isOnboardingSession.current = true;
  }

  // The onboarding-session latch only guards wallets onboarding has not yet
  // enrolled. A social repair targets an already-enrolled wallet, so it runs in
  // the session that finds Basic Functionality off rather than the next launch.
  const shouldRunConsolidation =
    (isFlagEnabled && !isConsolidated && !isOnboardingSession.current) ||
    shouldRepairSocialLoginBasicFunctionality;

  useEffect(() => {
    if (
      !shouldRunConsolidation ||
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
  }, [completedOnboarding, dispatch, isUnlocked, shouldRunConsolidation]);

  // `isUnlocked` is not enough on its own to keep the notice off the lock
  // screen, since the keyring unlocks before Login hands the session over.
  // Mounting on the wallet stack is what guarantees the handoff has happened;
  // `isUnlocked` covers LockScreen, which covers the wallet without
  // unmounting it. Clearing the ref while locked lets it present on unlock.
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
      // keep the Settings link tappable on the lock screen. Swipe and
      // toast.dismiss() share closeToast() and do not call onClose, so this
      // flag is only needed if that wiring changes.
      if (hasPresentedToast.current) {
        isHidingToastWithoutAck.current = true;
        toast.dismiss();
        isHidingToastWithoutAck.current = false;
      }
      hasPresentedToast.current = false;
      hasAcknowledgedToast.current = false;
      return;
    }
    if (hasPresentedToast.current) {
      return;
    }

    const acknowledgeToast = (
      action: BasicFunctionalityMixedToastAction.DISMISS,
    ) => {
      if (isHidingToastWithoutAck.current || hasAcknowledgedToast.current) {
        return;
      }
      hasAcknowledgedToast.current = true;
      trackMixedToastNotice(action);
      dispatch(dismissBasicFunctionalityMigrationNotification());
    };

    hasPresentedToast.current = true;
    trackMixedToastNotice(BasicFunctionalityMixedToastAction.VIEWED);
    toast({
      hasNoTimeout: true,
      // The design system close button occupies its own column for the whole
      // toast height, which wraps every description line short of the edge.
      // Render it beside the title instead so the description spans the width.
      showCloseButton: false,
      title: (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="flex-1"
          >
            {strings('basic_functionality_migration.title')}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            accessibilityLabel={strings('navigation.close')}
            // The 32pt touch target would otherwise grow the title row and sit
            // further in than the padding the toast reserves for its own close
            // button.
            twClassName="-my-1 -mr-2"
            onPress={() => {
              acknowledgeToast(BasicFunctionalityMixedToastAction.DISMISS);
              toast.dismiss();
            }}
          />
        </Box>
      ),
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
              if (!hasAcknowledgedToast.current) {
                hasAcknowledgedToast.current = true;
                trackMixedToastNotice(
                  BasicFunctionalityMixedToastAction.OPEN_SETTINGS,
                );
                dispatch(dismissBasicFunctionalityMigrationNotification());
              }
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
      // Today's Toaster only invokes this from its own close button, which we
      // hide. Swipe and toast.dismiss() use closeToast() and skip it. Keep the
      // handler so a later Toaster that forwards those paths still acknowledges,
      // without treating a lock-screen hide as dismiss.
      onClose: () => {
        acknowledgeToast(BasicFunctionalityMixedToastAction.DISMISS);
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
