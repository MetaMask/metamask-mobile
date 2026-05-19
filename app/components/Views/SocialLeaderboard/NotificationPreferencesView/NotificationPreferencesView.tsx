import React, { useCallback } from 'react';
import {
  Image,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
  FontWeight,
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
  playImpact,
  ImpactMoment,
} from '../../../../util/haptics';
import { NotificationPreferencesViewSelectorsIDs } from './NotificationPreferencesView.testIds';
import {
  useNotificationPreferences,
  useFollowedTraders,
  type TxAmountThreshold,
} from './hooks';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import {
  PreferencesSkeleton,
  TradersFollowedSkeleton,
} from './components/Skeletons';
import ThresholdRadioList from './components/ThresholdRadioList';

const AVATAR_SIZE = 40;

// ---------------------------------------------------------------------------
// Per-trader row
// ---------------------------------------------------------------------------

interface TraderNotificationRowProps {
  traderId: string;
  username: string;
  avatarUri?: string;
  isEnabled: boolean;
  isDisabled: boolean;
  onToggle: (traderId: string) => void;
  onPress: (traderId: string, username: string) => void;
}

const TraderNotificationRow: React.FC<TraderNotificationRowProps> = ({
  traderId,
  username,
  avatarUri,
  isEnabled,
  isDisabled,
  onToggle,
  onPress,
}) => {
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`px-4 py-3${isDisabled ? ' opacity-50' : ''}`}
      testID={NotificationPreferencesViewSelectorsIDs.TRADER_ROW(traderId)}
    >
      <TouchableOpacity
        onPress={() => onPress(traderId, username)}
        accessibilityRole="button"
        style={tw.style('flex-row items-center gap-3 flex-1 min-w-0 mr-3')}
        testID={NotificationPreferencesViewSelectorsIDs.TRADER_PRESS(traderId)}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={tw.style(
              `w-[${AVATAR_SIZE}px] h-[${AVATAR_SIZE}px] rounded-full bg-muted`,
            )}
            resizeMode="cover"
          />
        ) : (
          <AvatarBase
            size={AvatarBaseSize.Lg}
            fallbackText={username.charAt(0).toUpperCase()}
          />
        )}

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          twClassName="flex-1"
        >
          {username}
        </Text>
      </TouchableOpacity>

      <Switch
        value={isEnabled}
        onValueChange={() => onToggle(traderId)}
        disabled={isDisabled}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={brandColors.white}
        ios_backgroundColor={colors.border.muted}
        testID={NotificationPreferencesViewSelectorsIDs.TRADER_TOGGLE(traderId)}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

/**
 * NotificationPreferencesView — notification settings for the Top Traders feature.
 *
 * Lets the user control:
 * - Global push notification toggle (socialAI.enabled)
 * - Minimum trade size threshold (socialAI.txAmountLimit)
 * - Per-trader mute list (socialAI.mutedTraderProfileIds — opt-out semantics: traders absent from this list receive notifications)
 *
 * The "Traders you follow" section is sourced from
 * `SocialService:fetchFollowing` (via `useFollowedTraders`) so it surfaces
 * every trader the user follows — not just the ones that happen to be in
 * the cached top-leaderboard slice. Preferences themselves are persisted
 * through `AuthenticatedUserStorageService` (via `useNotificationPreferences`).
 */
const NotificationPreferencesView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const {
    traders: followedTraders,
    isLoading: isLoadingFollowed,
    error: followedError,
    refresh: refreshFollowed,
  } = useFollowedTraders({ enabled: isEnabled });

  const {
    preferences,
    isLoading: isLoadingPreferences,
    setEnabled,
    setTxAmountLimit,
    toggleTraderNotification,
    isTraderNotificationEnabled,
  } = useNotificationPreferences();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
      });
    },
    [navigation],
  );

  // On a cold (re)entry the GET is in flight, `preferences` falls back to
  // defaults (`enabled: false`), and binding that straight into the Switch
  // would render a visibly OFF toggle until the fetch resolves — even when
  // the user previously had it ON. Render a skeleton instead; interaction
  // remains disabled until we have authoritative server state.
  const showPreferencesSkeleton = isLoadingPreferences;
  // Treat "still loading" identically to "disabled" so the traders section
  // never renders in a muted/disabled state based on the false default while
  // the preferences GET is in flight.
  const globalOff = isLoadingPreferences || !preferences.enabled;

  // Master switch is the gating control for the whole feature, so it should
  // feel weightier than the native iOS UISwitch tick — `override: true`
  // ensures the Medium impact also fires on iOS. Skipped while preferences
  // are still loading even though the switch is hidden behind the skeleton,
  // to keep the haptic and the persisted call symmetric.
  const handleSetEnabled = useCallback(
    (value: boolean) => {
      if (isLoadingPreferences) {
        return Promise.resolve();
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });
      return setEnabled(value);
    },
    [isLoadingPreferences, setEnabled],
  );

  // Per-trader switch is a subordinate toggle; rely on iOS UISwitch's native
  // tick on iOS, fire a Light impact only on Android where there is none.
  // The Switch is also rendered with `disabled={globalOff}`, but we guard
  // here too so the haptic never leaks through if the callback fires while
  // the row is disabled (mid-interaction state flips, a11y taps, etc.).
  const handleToggleTrader = useCallback(
    (traderId: string) => {
      if (globalOff) {
        return Promise.resolve();
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Light);
      return toggleTraderNotification(traderId);
    },
    [globalOff, toggleTraderNotification],
  );

  // Threshold rows are TouchableOpacity (no native iOS haptic), so fire on
  // both platforms — but only when the value actually changes, to avoid a
  // phantom buzz when the user re-taps the already-selected option. Also
  // guarded against firing while the section is disabled by the master
  // toggle, even though the row's TouchableOpacity is itself `disabled`.
  const handleSetTxAmountLimit = useCallback(
    (value: TxAmountThreshold) => {
      if (globalOff || value === preferences.txAmountLimit) {
        return Promise.resolve();
      }
      playImpact(ImpactMoment.QuickAmountSelection);
      return setTxAmountLimit(value);
    },
    [globalOff, preferences.txAmountLimit, setTxAmountLimit],
  );

  const showFollowedError =
    Boolean(followedError) && followedTraders.length === 0;
  const showFollowedLoading =
    !showFollowedError && isLoadingFollowed && followedTraders.length === 0;
  const showFollowedEmpty =
    !showFollowedError && !isLoadingFollowed && followedTraders.length === 0;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={NotificationPreferencesViewSelectorsIDs.CONTAINER}
    >
      {/* Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          testID={NotificationPreferencesViewSelectorsIDs.BACK_BUTTON}
        />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {strings('social_leaderboard.notification_preferences.title')}
        </Text>
        {/* Spacer to keep title centred */}
        <Box twClassName="w-10" />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {/* ── Global toggle + thresholds ────────────────────────────── */}
        {showPreferencesSkeleton ? (
          <PreferencesSkeleton />
        ) : (
          <>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="px-4 py-4"
            >
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings(
                  'social_leaderboard.notification_preferences.allow_push_notifications',
                )}
              </Text>
              <Switch
                value={preferences.enabled}
                onValueChange={handleSetEnabled}
                trackColor={{
                  true: colors.primary.default,
                  false: colors.border.muted,
                }}
                thumbColor={brandColors.white}
                ios_backgroundColor={colors.border.muted}
                testID={NotificationPreferencesViewSelectorsIDs.GLOBAL_TOGGLE}
              />
            </Box>

            <View style={tw.style('h-px bg-muted mx-4')} />

            <ThresholdRadioList
              selected={(preferences.txAmountLimit ?? 500) as TxAmountThreshold}
              onChange={handleSetTxAmountLimit}
              isDisabled={globalOff}
              currency={currentCurrency}
              labelText={strings(
                'social_leaderboard.notification_preferences.trades_over_label',
              )}
              testIDForAmount={
                NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION
              }
            />
          </>
        )}

        {/* Separator */}
        <View style={tw.style('h-px bg-muted mx-4 mt-2')} />

        <Box
          twClassName="px-4 pt-5 pb-2"
          testID={NotificationPreferencesViewSelectorsIDs.TRADERS_SECTION}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={globalOff ? TextColor.TextMuted : TextColor.TextDefault}
          >
            {strings(
              'social_leaderboard.notification_preferences.traders_you_follow',
            )}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-0.5"
          >
            {strings(
              'social_leaderboard.notification_preferences.traders_you_follow_desc',
            )}
          </Text>
        </Box>

        {showFollowedError ? (
          <Box testID={NotificationPreferencesViewSelectorsIDs.TRADERS_ERROR}>
            <ErrorState
              title={strings(
                'social_leaderboard.notification_preferences.error_loading_followed',
              )}
              onRetry={refreshFollowed}
            />
          </Box>
        ) : showFollowedLoading ? (
          <View
            testID={NotificationPreferencesViewSelectorsIDs.TRADERS_LOADING}
          >
            <TradersFollowedSkeleton />
          </View>
        ) : showFollowedEmpty ? (
          <Box
            twClassName="px-4 py-6"
            testID={NotificationPreferencesViewSelectorsIDs.TRADERS_EMPTY}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings(
                'social_leaderboard.notification_preferences.traders_you_follow_empty',
              )}
            </Text>
          </Box>
        ) : (
          followedTraders.map((trader) => (
            <TraderNotificationRow
              key={trader.id}
              traderId={trader.id}
              username={trader.username}
              avatarUri={trader.avatarUri}
              isEnabled={isTraderNotificationEnabled(trader.id)}
              isDisabled={globalOff}
              onToggle={handleToggleTrader}
              onPress={handleTraderPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationPreferencesView;
