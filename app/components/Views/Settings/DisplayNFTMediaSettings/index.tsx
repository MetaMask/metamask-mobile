import React from 'react';
import { View, Switch } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../component-library/hooks';
import Engine from '../../../../core/Engine';
import { selectDisplayNftMedia } from '../../../../selectors/preferencesController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import styleSheet from './index.styles';
import { NFT_DISPLAY_MEDIA_MODE_SECTION } from './index.constants';

const DisplayNFTMediaSettings = () => {
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, {});

  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const toggleDisplayNftMedia = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setDisplayNftMedia(value);
    if (!value) PreferencesController?.setUseNftDetection(value);
  };

  return (
    <View style={styles.halfSetting}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.display_nft_media')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            testID={NFT_DISPLAY_MEDIA_MODE_SECTION}
            value={displayNftMedia}
            onValueChange={toggleDisplayNftMedia}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.display_nft_media_desc_new')}
      </Text>
    </View>
  );
};

export default DisplayNFTMediaSettings;
