// external packages
import React, { useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';

// internal packages
import Engine from '../../../../core/Engine';
import { selectUseTokenDetection } from '../../../../selectors/preferencesController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import createStyles from './AutoDetectTokensSettings.styles';
import { TOKEN_DETECTION_TOGGLE } from './AutoDetectTokensSettings.constants';

const AutoDetectTokensSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);

  const toggleTokenDetection = useCallback((value: boolean) => {
    Engine.context.PreferencesController.setUseTokenDetection(value);
  }, []);

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
