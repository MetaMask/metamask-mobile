// Third party dependencies
import React, { useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies
import { useStyles } from '../../../../component-library/hooks';
import Engine from '../../../../core/Engine';
import { selectUseTokenDetection } from '../../../../selectors/preferencesController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';

// Internal dependencies
import styleSheet from './index.styles';
import { TOKEN_DETECTION_TOGGLE } from './index.constants';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useMetrics } from '../../../hooks/useMetrics';

const AutoDetectTokensSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, {});
  const { addTraitsToUser } = useMetrics();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);

  const toggleTokenDetection = useCallback(
    (value: boolean) => {
      Engine.context.PreferencesController.setUseTokenDetection(value);
      addTraitsToUser({
        [UserProfileProperty.TOKEN_DETECTION]: value
          ? UserProfileProperty.ON
          : UserProfileProperty.OFF,
      });
    },
    [addTraitsToUser],
  );

  return (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.token_detection_title')}
        </Text>
        <View style={styles.toggle}>
          <Switch
            testID={TOKEN_DETECTION_TOGGLE}
            value={isTokenDetectionEnabled}
            onValueChange={toggleTokenDetection}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            ios_backgroundColor={colors.border.muted}
            style={styles.switch}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.token_detection_description')}
      </Text>
    </View>
  );
};

export default AutoDetectTokensSettings;
