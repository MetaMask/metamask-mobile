import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { useSeasonStatus } from '../hooks/useSeasonStatus';

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
  const { isLoading: isOptingOut, showOptoutBottomSheet } = useOptout();

  useSeasonStatus(); // this view doesnt have seasonstatus component so we need this if this data shouldn't be available.

  // Check if any account operations are loading
  const {
    isAccountSyncingInProgress,
    loadingMessage: accountSyncingLoadingMessage,
  } = useAccountsOperationsLoadingStates();

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

          {isAccountSyncingInProgress && (
            <Box twClassName="-mx-4">
              <Banner
                variant={BannerVariant.Alert}
                severity={BannerAlertSeverity.Info}
                title={accountSyncingLoadingMessage}
                description={strings('rewards.settings.accounts_syncing')}
                testID="account-syncing-banner"
              />
            </Box>
          )}

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
              onPress={() =>
                showOptoutBottomSheet(Routes.REWARDS_SETTINGS_VIEW)
              }
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
