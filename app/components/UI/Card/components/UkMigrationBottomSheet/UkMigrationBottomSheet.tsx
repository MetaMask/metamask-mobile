import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Text,
  TextVariant,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { formatUkMigrationDeadline } from '../../utils/formatUkMigrationDeadline';
import { UkMigrationBottomSheetSelectors } from './UkMigrationBottomSheet.testIds';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { useCardUkMigrationState } from '../../hooks/useCardUkMigrationState';
import {
  CardActions,
  CardFlow,
  CardScreens,
  mapUkMigrationPhaseToAnalytics,
  withCardProvider,
} from '../../util/metrics';

export const createUkMigrationBottomSheetNavigationDetails =
  createNavigationDetails(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.UK_MIGRATION,
  );

const MIGRATION_STEP_KEYS = [
  'card.uk_migration_bottom_sheet.steps.reverify_identity',
  'card.uk_migration_bottom_sheet.steps.get_new_card_number',
  'card.uk_migration_bottom_sheet.steps.convert_funds_usdc_base',
] as const;

/**
 * UK Card provider migration prompt.
 *
 * Get started closes the sheet and opens Immersve SignUp with
 * `fromMigration: true`. Soft vs forced presentation is owned by Card Home
 * via `useCardUkMigrationState` (clock-aware phase).
 */
const UkMigrationBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasTrackedView = useRef(false);
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    state: { deadline, phase },
  } = useCardUkMigrationState();
  const migrationPhase = mapUkMigrationPhaseToAnalytics(phase);

  const migrationEventProperties = useMemo(
    () =>
      withCardProvider(CardProviderIds.Baanx, {
        flow: CardFlow.MIGRATION,
        ...(migrationPhase ? { migration_phase: migrationPhase } : {}),
      }),
    [migrationPhase],
  );

  const description = useMemo(() => {
    if (!deadline) {
      return strings('card.uk_migration_bottom_sheet.description_no_deadline');
    }
    return strings('card.uk_migration_bottom_sheet.description', {
      deadline: formatUkMigrationDeadline(deadline, { includeYear: true }),
    });
  }, [deadline]);

  useEffect(() => {
    if (hasTrackedView.current) {
      return;
    }
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          ...migrationEventProperties,
          screen: CardScreens.MIGRATION_UPDATE_SHEET,
        })
        .build(),
    );
  }, [createEventBuilder, migrationEventProperties, trackEvent]);

  const trackMigrationButton = useCallback(
    (action: CardActions) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            ...migrationEventProperties,
            action,
          })
          .build(),
      );
    },
    [createEventBuilder, migrationEventProperties, trackEvent],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    trackMigrationButton(CardActions.MIGRATION_SHEET_CLOSE_BUTTON);
    sheetRef.current?.onCloseBottomSheet();
  }, [trackMigrationButton]);

  const handleGetStarted = useCallback(() => {
    trackMigrationButton(CardActions.MIGRATION_SHEET_GET_STARTED_BUTTON);
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.SIGN_UP,
        params: { fromMigration: true },
      });
    });
  }, [navigation, trackMigrationButton]);

  const handleRemindLater = useCallback(() => {
    trackMigrationButton(CardActions.MIGRATION_SHEET_REMIND_ME_LATER_BUTTON);
    sheetRef.current?.onCloseBottomSheet();
  }, [trackMigrationButton]);

  const steps = useMemo(
    () =>
      MIGRATION_STEP_KEYS.map((key, index) => ({
        number: index + 1,
        label: strings(key),
      })),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      keyboardAvoidingViewEnabled={false}
      testID={UkMigrationBottomSheetSelectors.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: UkMigrationBottomSheetSelectors.CLOSE_BUTTON,
        }}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={UkMigrationBottomSheetSelectors.TITLE}
        >
          {strings('card.uk_migration_bottom_sheet.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-6 gap-6">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative"
          testID={UkMigrationBottomSheetSelectors.DESCRIPTION}
        >
          {description}
        </Text>

        <Box twClassName="gap-4" testID={UkMigrationBottomSheetSelectors.STEPS}>
          {steps.map((step) => (
            <Box
              key={step.number}
              twClassName="flex-row items-center gap-3"
              testID={UkMigrationBottomSheetSelectors.step(step.number)}
            >
              <Box twClassName="w-6 h-6 rounded-full bg-icon-default items-center justify-center">
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-background-default"
                >
                  {step.number}
                </Text>
              </Box>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="flex-1"
              >
                {step.label}
              </Text>
            </Box>
          ))}
        </Box>

        <Box twClassName="gap-4">
          <Button
            onPress={handleGetStarted}
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            testID={UkMigrationBottomSheetSelectors.GET_STARTED_BUTTON}
          >
            {strings('card.uk_migration_bottom_sheet.get_started')}
          </Button>

          <Button
            onPress={handleRemindLater}
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            isFullWidth
            testID={UkMigrationBottomSheetSelectors.REMIND_LATER_BUTTON}
          >
            {strings('card.uk_migration_bottom_sheet.remind_me_later')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default UkMigrationBottomSheet;
