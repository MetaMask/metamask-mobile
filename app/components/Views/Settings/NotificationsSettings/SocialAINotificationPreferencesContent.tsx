import React, { useCallback } from 'react';
import { Image, Switch, TouchableOpacity, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBase,
  AvatarBaseSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
  ImpactMoment,
  playImpact,
} from '../../../../util/haptics';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorState from '../../Homepage/components/ErrorState/ErrorState';
import {
  DEFAULT_TX_AMOUNT_LIMIT,
  useFollowedTraders,
  useNotificationPreferences,
  type TxAmountThreshold,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../SocialLeaderboard/NotificationPreferences/hooks';
import {
  PreferencesSkeleton,
  TradersFollowedSkeleton,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../SocialLeaderboard/NotificationPreferences/components/Skeletons';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ThresholdRadioList from '../../SocialLeaderboard/NotificationPreferences/components/ThresholdRadioList';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { NotificationPreferencesSelectorsIDs } from '../../SocialLeaderboard/NotificationPreferences/NotificationPreferences.testIds';

const AVATAR_SIZE = 40;

interface TraderNotificationRowProps {
  traderId: string;
  username: string;
  avatarUri?: string;
  isEnabled: boolean;
  isDisabled: boolean;
  withHorizontalPadding: boolean;
  onToggle: (traderId: string) => void;
  onPress: (traderId: string, username: string) => void;
}

const TraderNotificationRow: React.FC<TraderNotificationRowProps> = ({
  traderId,
  username,
  avatarUri,
  isEnabled,
  isDisabled,
  withHorizontalPadding,
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
      twClassName={`${withHorizontalPadding ? 'px-4' : ''} py-3${
        isDisabled ? ' opacity-50' : ''
      }`}
      testID={NotificationPreferencesSelectorsIDs.TRADER_ROW(traderId)}
    >
      <TouchableOpacity
        onPress={() => onPress(traderId, username)}
        accessibilityRole="button"
        style={tw.style('flex-row items-center gap-3 flex-1 min-w-0 mr-3')}
        testID={NotificationPreferencesSelectorsIDs.TRADER_PRESS(traderId)}
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
        testID={NotificationPreferencesSelectorsIDs.TRADER_TOGGLE(traderId)}
      />
    </Box>
  );
};

export interface SocialAINotificationPreferencesContentProps {
  showPushToggle?: boolean;
  withHorizontalPadding?: boolean;
}

const SocialAINotificationPreferencesContent = ({
  showPushToggle = true,
  withHorizontalPadding = true,
}: SocialAINotificationPreferencesContentProps) => {
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
    setPushNotificationsEnabled,
    setTxAmountLimit,
    toggleTraderNotification,
    isTraderNotificationEnabled,
  } = useNotificationPreferences();

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
      });
    },
    [navigation],
  );

  const showPreferencesSkeleton = isLoadingPreferences;
  const pushNotificationsOff =
    isLoadingPreferences || !preferences.pushNotificationsEnabled;

  const handleSetEnabled = useCallback(
    (value: boolean) => {
      if (isLoadingPreferences) {
        return Promise.resolve();
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });
      return setPushNotificationsEnabled(value);
    },
    [isLoadingPreferences, setPushNotificationsEnabled],
  );

  const handleToggleTrader = useCallback(
    (traderId: string) => {
      if (pushNotificationsOff) {
        return Promise.resolve();
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Light);
      return toggleTraderNotification(traderId);
    },
    [pushNotificationsOff, toggleTraderNotification],
  );

  const handleSetTxAmountLimit = useCallback(
    (value: TxAmountThreshold) => {
      if (pushNotificationsOff || value === preferences.txAmountLimit) {
        return Promise.resolve();
      }
      playImpact(ImpactMoment.QuickAmountSelection);
      return setTxAmountLimit(value);
    },
    [pushNotificationsOff, preferences.txAmountLimit, setTxAmountLimit],
  );

  const showFollowedError =
    Boolean(followedError) && followedTraders.length === 0;
  const showFollowedLoading =
    !showFollowedError && isLoadingFollowed && followedTraders.length === 0;
  const showFollowedEmpty =
    !showFollowedError && !isLoadingFollowed && followedTraders.length === 0;
  const horizontalPaddingClassName = withHorizontalPadding ? 'px-4' : '';
  const separatorStyle = tw.style(
    `h-px bg-muted${withHorizontalPadding ? ' mx-4' : ''}`,
  );

  return (
    <>
      {showPreferencesSkeleton ? (
        <PreferencesSkeleton />
      ) : (
        <>
          {showPushToggle ? (
            <>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName={`${horizontalPaddingClassName} py-4`}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {strings(
                    'social_leaderboard.notification_preferences.allow_push_notifications',
                  )}
                </Text>
                <Switch
                  value={Boolean(preferences.pushNotificationsEnabled)}
                  onValueChange={handleSetEnabled}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={brandColors.white}
                  ios_backgroundColor={colors.border.muted}
                  testID={NotificationPreferencesSelectorsIDs.GLOBAL_TOGGLE}
                />
              </Box>

              <View style={separatorStyle} />
            </>
          ) : null}

          <ThresholdRadioList
            selected={
              (preferences.txAmountLimit ??
                DEFAULT_TX_AMOUNT_LIMIT) as TxAmountThreshold
            }
            onChange={handleSetTxAmountLimit}
            isDisabled={pushNotificationsOff}
            currency={currentCurrency}
            labelText={strings(
              'social_leaderboard.notification_preferences.trades_over_label',
            )}
            withHorizontalPadding={withHorizontalPadding}
            testIDForAmount={
              NotificationPreferencesSelectorsIDs.THRESHOLD_OPTION
            }
          />
        </>
      )}

      <Box
        twClassName={`${horizontalPaddingClassName} pt-5 pb-2`}
        testID={NotificationPreferencesSelectorsIDs.TRADERS_SECTION}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={
            pushNotificationsOff ? TextColor.TextMuted : TextColor.TextDefault
          }
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
        <Box testID={NotificationPreferencesSelectorsIDs.TRADERS_ERROR}>
          <ErrorState
            title={strings(
              'social_leaderboard.notification_preferences.error_loading_followed',
            )}
            onRetry={refreshFollowed}
          />
        </Box>
      ) : showFollowedLoading ? (
        <View testID={NotificationPreferencesSelectorsIDs.TRADERS_LOADING}>
          <TradersFollowedSkeleton />
        </View>
      ) : showFollowedEmpty ? (
        <Box
          twClassName={`${horizontalPaddingClassName} py-6`}
          testID={NotificationPreferencesSelectorsIDs.TRADERS_EMPTY}
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
            isDisabled={pushNotificationsOff}
            withHorizontalPadding={withHorizontalPadding}
            onToggle={handleToggleTrader}
            onPress={handleTraderPress}
          />
        ))
      )}
    </>
  );
};

export default SocialAINotificationPreferencesContent;
