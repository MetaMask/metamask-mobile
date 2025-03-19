import React, { useCallback } from 'react';
import { View, Switch, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectIsMultiAccountBalancesEnabled } from '../../../../selectors/preferencesController';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import styleSheet from './index.styles';
import {
  BATCH_BALANCE_REQUESTS_SECTION,
  SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
} from './index.constants';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useMetrics } from '../../../hooks/useMetrics';

const BatchAccountBalanceSettings = () => {
  const { PreferencesController } = Engine.context;
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, {});
  const { addTraitsToUser } = useMetrics();

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );

  const toggleIsMultiAccountBalancesEnabled = useCallback(
    (multiAccountBalancesEnabled: boolean) => {
      PreferencesController.setIsMultiAccountBalancesEnabled(
        multiAccountBalancesEnabled,
      );
      addTraitsToUser({
        [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: multiAccountBalancesEnabled
          ? UserProfileProperty.ON
          : UserProfileProperty.OFF,
      });
    },
    [PreferencesController, addTraitsToUser],
  );

  return (
    <View style={styles.halfSetting} testID={BATCH_BALANCE_REQUESTS_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.batch_balance_requests_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isMultiAccountBalancesEnabled}
            onValueChange={toggleIsMultiAccountBalancesEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            {...generateTestId(
              Platform,
              SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
            )}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.batch_balance_requests_description')}
      </Text>
    </View>
  );
};

export default BatchAccountBalanceSettings;
