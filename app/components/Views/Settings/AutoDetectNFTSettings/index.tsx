// Third party dependencies
import React, { useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies
import Engine from '../../../../core/Engine';
import { selectUseNftDetection } from '../../../../selectors/preferencesController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

// Internal dependencies
import createStyles from './index.styles';
import { NFT_AUTO_DETECT_MODE_SECTION } from './index.constants';

const AutoDetectNFTSettings = () => {
  const { trackEvent, addTraitsToUser, createEventBuilder } = useMetrics();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const useNftDetection = useSelector(selectUseNftDetection);

  const toggleNftAutodetect = useCallback(
    (value: boolean) => {
      const { PreferencesController } = Engine.context;
      if (value) {
        PreferencesController.setDisplayNftMedia(value);
      }
      PreferencesController.setUseNftDetection(value);

      addTraitsToUser({
        ...(value && {
          [UserProfileProperty.ENABLE_OPENSEA_API]: value
            ? UserProfileProperty.ON
            : UserProfileProperty.OFF,
        }),
        [UserProfileProperty.NFT_AUTODETECTION]: value
          ? UserProfileProperty.ON
          : UserProfileProperty.OFF,
      });

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NFT_AUTO_DETECTION_ENABLED)
          .addProperties({
            ...(value && { [UserProfileProperty.ENABLE_OPENSEA_API]: value }),
            [UserProfileProperty.NFT_AUTODETECTION]: value,
            location: 'app_settings',
          })
          .build(),
      );
    },
    [addTraitsToUser, trackEvent, createEventBuilder],
  );

  return (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.nft_autodetect_mode')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={useNftDetection}
            onValueChange={toggleNftAutodetect}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={NFT_AUTO_DETECT_MODE_SECTION}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.autodetect_nft_desc')}
      </Text>
    </View>
  );
};

export default AutoDetectNFTSettings;
