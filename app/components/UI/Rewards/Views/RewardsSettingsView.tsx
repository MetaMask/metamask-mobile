import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Banner, {
  BannerVariant,
} from '../../../../component-library/components/Banners/Banner';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Toast from '../../../../component-library/components/Toast';
import { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import RewardSettingsTabs from '../components/Settings/RewardSettingsTabs';
import { selectRewardsActiveAccountHasOptedIn } from '../../../../selectors/rewards';
import { useOptout } from '../hooks/useOptout';

interface RewardsSettingsViewRouteParams {
  focusUnlinkedTab?: boolean;
}

const RewardsSettingsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as
    | RewardsSettingsViewRouteParams
    | undefined;
  const { colors } = useTheme();
  const hasAccountOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const toastRef = useRef<ToastRef>(null);
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout(toastRef);

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

  // Determine initial tab based on route params or current account opt-in status
  const initialTabIndex = useMemo(() => {
    // If route specifies to focus unlinked tab, use that
    if (routeParams?.focusUnlinkedTab) {
      return 1;
    }
    // If current account is not opted in, start with unlinked tab (index 1)
    if (hasAccountOptedIn === false) {
      return 1;
    }
    // Otherwise, start with linked tab (index 0)
    return 0;
  }, [hasAccountOptedIn, routeParams?.focusUnlinkedTab]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsSettingsView">
      <SafeAreaView style={tw.style('flex-1 bg-default px-4 -mt-8')}>
        <Box twClassName="flex-1 gap-6">
          {/* Section 1: Connect Multiple Accounts */}
          <Box twClassName="gap-4">
            <Box twClassName="gap-2">
              <Text variant={TextVariant.HeadingMd}>
                {strings('rewards.settings.subtitle')}
              </Text>
            </Box>
          </Box>

          {/* Current Account Not Opted In Banner */}
          {hasAccountOptedIn === false && (
            <Box twClassName="-mx-4">
              <Banner
                variant={BannerVariant.Alert}
                severity={BannerAlertSeverity.Info}
                title={strings('rewards.unlinked_account_info.title')}
                description={strings(
                  'rewards.unlinked_account_info.description',
                )}
              />
            </Box>
          )}

          {/* Section 2: Account Tabs */}
          <RewardSettingsTabs initialTabIndex={initialTabIndex} />

          {/* Section 3: Opt Out */}
          <Box twClassName="gap-4 flex-col mb-4">
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
              onPress={() =>
                showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW)
              }
            />
          </Box>
        </Box>

        {/* Toast for success feedback */}
        <Toast ref={toastRef} />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsSettingsView;
