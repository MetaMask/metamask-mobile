import React, { useCallback } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { NotificationPreferencesViewSelectorsIDs } from './NotificationPreferencesView.testIds';
import { useNotificationPreferences, TX_AMOUNT_THRESHOLDS } from './hooks';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

const AVATAR_SIZE = 40;

const radioStyles = StyleSheet.create({
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

// ---------------------------------------------------------------------------
// Threshold radio row
// ---------------------------------------------------------------------------

interface ThresholdRowProps {
  label: string;
  isChecked: boolean;
  isDisabled: boolean;
  onPress: () => void;
  testID?: string;
}

const ThresholdRow: React.FC<ThresholdRowProps> = ({
  label,
  isChecked,
  isDisabled,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const borderColor = isChecked
    ? colors.primary.default
    : colors.border.default;
  const innerColor = colors.primary.default;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={tw.style(
        'flex-row items-center justify-between px-4 py-4',
        isDisabled && 'opacity-50',
      )}
      accessibilityRole="radio"
      accessibilityState={{ checked: isChecked, disabled: isDisabled }}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={isDisabled ? TextColor.TextMuted : TextColor.TextDefault}
      >
        {label}
      </Text>
      {/* Radio circle indicator — View-only, touches handled by the outer TouchableOpacity */}
      <View
        style={[
          radioStyles.circle,
          { borderColor, backgroundColor: colors.background.default },
        ]}
        accessibilityElementsHidden
      >
        {isChecked && (
          <View style={[radioStyles.dot, { backgroundColor: innerColor }]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

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
}

const TraderNotificationRow: React.FC<TraderNotificationRowProps> = ({
  traderId,
  username,
  avatarUri,
  isEnabled,
  isDisabled,
  onToggle,
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="flex-1 min-w-0 mr-3"
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
      </Box>

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

const formatThreshold = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount}`;
  }
};

/**
 * NotificationPreferencesView — notification settings for the Top Traders feature.
 *
 * Lets the user control:
 * - Global push notification toggle (socialAI.enabled)
 * - Minimum trade size threshold (socialAI.txAmountLimit)
 * - Per-trader notification toggles (socialAI.traderProfileIds)
 */
const NotificationPreferencesView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const { traders } = useTopTraders({ enabled: isEnabled });

  const followedTraders = traders.filter((t) => t.isFollowing);

  const {
    preferences,
    setEnabled,
    setTxAmountLimit,
    toggleTraderNotification,
  } = useNotificationPreferences(followedTraders);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const globalOff = !preferences.enabled;

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
        {/* ── Global toggle ─────────────────────────────────────────── */}
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
            onValueChange={setEnabled}
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

        <Box twClassName="px-4 pt-4 pb-2">
          <Text
            variant={TextVariant.BodyMd}
            color={globalOff ? TextColor.TextMuted : TextColor.TextDefault}
          >
            {strings(
              'social_leaderboard.notification_preferences.trades_over_label',
            )}
          </Text>
        </Box>

        {TX_AMOUNT_THRESHOLDS.map((amount) => (
          <ThresholdRow
            key={amount}
            label={formatThreshold(amount, currentCurrency)}
            isChecked={preferences.txAmountLimit === amount}
            isDisabled={globalOff}
            onPress={() => setTxAmountLimit(amount)}
            testID={NotificationPreferencesViewSelectorsIDs.THRESHOLD_OPTION(
              amount,
            )}
          />
        ))}

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

        {followedTraders.map((trader) => (
          <TraderNotificationRow
            key={trader.id}
            traderId={trader.id}
            username={trader.username}
            avatarUri={trader.avatarUri}
            isEnabled={preferences.traderNotifications[trader.id] ?? false}
            isDisabled={globalOff}
            onToggle={toggleTraderNotification}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationPreferencesView;
