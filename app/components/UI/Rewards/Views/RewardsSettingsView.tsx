import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import RewardSettingsAccountGroupList from '../components/Settings/RewardSettingsAccountGroupList';
import { useOptout } from '../hooks/useOptout';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { ScrollView } from 'react-native';
import { RewardsMetricsButtons } from '../utils';

const RewardsSettingsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedSettingsViewed = useRef(false);

  useSeasonStatus(); // this view doesnt have seasonstatus component so we need this if this data shouldn't be available.

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.settings.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation]);

  useEffect(() => {
    if (!hasTrackedSettingsViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_SETTINGS_VIEWED).build(),
      );
      hasTrackedSettingsViewed.current = true;
    }
  }, [trackEvent, createEventBuilder]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsSettingsView">
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-4')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="gap-6">
          {/* Section 1: Connect Multiple Accounts */}
          <Box twClassName="gap-4">
            <Box twClassName="gap-2">
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.settings.subtitle')}
              </Text>

              <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
                {strings('rewards.settings.description')}
              </Text>
            </Box>
          </Box>

          {/* Section 2: Account Tabs */}
          <RewardSettingsAccountGroupList />

          {/* Section 3: Opt Out */}
          <Box twClassName="gap-4 flex-col">
            <Box twClassName="gap-2">
              <Text variant={TextVariant.HeadingSm}>
                {strings('rewards.optout.title')}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {strings('rewards.optout.description')}
              </Text>
            </Box>

            <Button
              variant={ButtonVariants.Secondary}
              label={strings('rewards.optout.confirm')}
              isDisabled={isOptingOut}
              isDanger
              width={null as unknown as number}
              onPress={() => {
                showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW);
                trackEvent(
                  createEventBuilder(
                    MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
                  )
                    .addProperties({
                      button_type: RewardsMetricsButtons.OPT_OUT,
                    })
                    .build(),
                );
              }}
            />
          </Box>
        </Box>
      </ScrollView>
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
