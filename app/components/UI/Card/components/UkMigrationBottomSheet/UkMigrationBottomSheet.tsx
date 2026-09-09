import React, { useCallback, useMemo, useRef } from 'react';
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
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { UkMigrationBottomSheetSelectors } from './UkMigrationBottomSheet.testIds';

export const createUkMigrationBottomSheetNavigationDetails =
  createNavigationDetails(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.UK_MIGRATION,
  );

/**
 * Placeholder UK migration cutoff until a remote feature flag supplies it.
 * Month is 0-indexed (8 = September).
 */
const UK_MIGRATION_DEADLINE = new Date(2026, 8, 30);

const formatUkMigrationDeadline = (deadline: Date): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(deadline);

const MIGRATION_STEP_KEYS = [
  'card.uk_migration_bottom_sheet.steps.reverify_identity',
  'card.uk_migration_bottom_sheet.steps.get_new_card_number',
  'card.uk_migration_bottom_sheet.steps.convert_funds_usdc_base',
] as const;

/**
 * UK Card provider migration prompt.
 *
 * Intentionally unreachable from production Card Home until migration
 * entry points are wired. Get started closes the sheet and opens Immersve
 * SignUp with `fromMigration: true`.
 */
const UkMigrationBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGetStarted = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.SIGN_UP,
        params: { fromMigration: true },
      });
    });
  }, [navigation]);

  // For now, same as X / dismiss (DF3). Re-entry UX still TBD.
  const handleRemindLater = handleClose;

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
          {strings('card.uk_migration_bottom_sheet.description', {
            deadline: formatUkMigrationDeadline(UK_MIGRATION_DEADLINE),
          })}
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
