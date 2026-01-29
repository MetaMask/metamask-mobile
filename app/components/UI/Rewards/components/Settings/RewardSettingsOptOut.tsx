import React, { memo, useCallback } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { RewardsMetricsButtons } from '../../utils';
import { useOptout } from '../../hooks/useOptout';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';

const RewardSettingsOptOut: React.FC = () => {
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleOptOutPress = useCallback(() => {
    showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.OPT_OUT,
        })
        .build(),
    );
  }, [showOptoutBottomSheet, trackEvent, createEventBuilder]);

  return (
    <Box
      testID="rewards-settings-opt-out"
      twClassName="gap-4 flex-col py-4 px-4 border-t border-muted"
    >
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingSm}>
          {strings('rewards.optout.title')}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {strings('rewards.optout.description')}
        </Text>
      </Box>

      <Button
        testID="rewards-opt-out-button"
        variant={ButtonVariants.Secondary}
        label={strings('rewards.optout.confirm')}
        isDisabled={isOptingOut}
        isDanger
        width={null as unknown as number}
        onPress={handleOptOutPress}
      />
    </Box>
  );
};

export default memo(RewardSettingsOptOut);
