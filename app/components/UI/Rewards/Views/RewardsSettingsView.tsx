import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
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
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import RewardSettingsTabs from '../components/Settings/RewardSettingsTabs';
import { useOptout } from '../hooks/useOptout';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../utils';

const RewardsSettingsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const toastRef = useRef<ToastRef>(null);
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();
  const { trackEvent, createEventBuilder } = useMetrics();

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
          <RewardSettingsTabs initialTabIndex={0} />

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

      {/* Toast for success feedback */}
      <Toast ref={toastRef} />
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
