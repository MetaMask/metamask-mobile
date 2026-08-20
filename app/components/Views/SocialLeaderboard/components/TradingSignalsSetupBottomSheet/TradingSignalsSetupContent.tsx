import React, { useCallback } from 'react';
import { Switch, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
  ImpactMoment,
  playImpact,
} from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import ThresholdRadioList from '../../NotificationPreferences/components/ThresholdRadioList';
import {
  DEFAULT_TX_AMOUNT_LIMIT,
  useNotificationPreferences,
  type TxAmountThreshold,
} from '../../NotificationPreferences/hooks';
import { areTradingSignalsChannelsDisabled } from '../../NotificationPreferences/hooks/tradingSignalsChannels';
import { TradingSignalsSetupBottomSheetSelectorsIDs } from './TradingSignalsSetupBottomSheet.testIds';

const TradingSignalsSetupContent = () => {
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const currentCurrency = useSelector(selectCurrentCurrency);

  const {
    preferences,
    isLoading,
    setPushNotificationsEnabled,
    setInAppNotificationsEnabled,
    setTxAmountLimit,
  } = useNotificationPreferences();

  const tradingSignalsChannelsDisabled =
    isLoading || areTradingSignalsChannelsDisabled(preferences);

  const handleSetPushEnabled = useCallback(
    (value: boolean) => {
      if (isLoading) {
        return;
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });
      return setPushNotificationsEnabled(value);
    },
    [isLoading, setPushNotificationsEnabled],
  );

  const handleSetInAppEnabled = useCallback(
    (value: boolean) => {
      if (isLoading) {
        return;
      }
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });
      return setInAppNotificationsEnabled(value);
    },
    [isLoading, setInAppNotificationsEnabled],
  );

  const handleSetTxAmountLimit = useCallback(
    (value: TxAmountThreshold) => {
      if (
        tradingSignalsChannelsDisabled ||
        value === preferences.txAmountLimit
      ) {
        return;
      }
      playImpact(ImpactMoment.QuickAmountSelection);
      return setTxAmountLimit(value);
    },
    [
      tradingSignalsChannelsDisabled,
      preferences.txAmountLimit,
      setTxAmountLimit,
    ],
  );

  const separatorStyle = tw.style('h-px bg-muted mx-4 mt-4');

  return (
    <>
      <Box twClassName="px-4 pt-2 pb-4">
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('app_settings.notifications_opts.social_ai_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('app_settings.notifications_opts.social_ai_desc')}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-4"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('app_settings.notifications_opts.push_recommended')}
        </Text>
        <Switch
          value={Boolean(preferences.pushNotificationsEnabled)}
          onValueChange={handleSetPushEnabled}
          disabled={isLoading}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID={TradingSignalsSetupBottomSheetSelectorsIDs.PUSH_TOGGLE}
        />
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pb-4"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('app_settings.notifications_opts.in_app')}
        </Text>
        <Switch
          value={Boolean(preferences.inAppNotificationsEnabled)}
          onValueChange={handleSetInAppEnabled}
          disabled={isLoading}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID={TradingSignalsSetupBottomSheetSelectorsIDs.IN_APP_TOGGLE}
        />
      </Box>

      <View style={separatorStyle} />

      <ThresholdRadioList
        selected={
          (preferences.txAmountLimit ??
            DEFAULT_TX_AMOUNT_LIMIT) as TxAmountThreshold
        }
        onChange={handleSetTxAmountLimit}
        isDisabled={tradingSignalsChannelsDisabled}
        currency={currentCurrency}
        labelText={strings(
          'social_leaderboard.notification_preferences.trades_over_label',
        )}
        testIDForAmount={
          TradingSignalsSetupBottomSheetSelectorsIDs.THRESHOLD_OPTION
        }
      />
    </>
  );
};

export default TradingSignalsSetupContent;
