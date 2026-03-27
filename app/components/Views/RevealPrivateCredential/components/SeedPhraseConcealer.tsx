import React from 'react';
import { ImageBackground, TouchableOpacity, View } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { AppThemeKey } from '../../../../util/theme/models';
import { useTheme } from '../../../../util/theme';
import blurImage from '../../../../images/blur.png';
import darkBlurImage from '../../../../images/dark-blur.png';
import { SeedPhraseConcealerProps } from '../types';

const SeedPhraseConcealer = ({
  onReveal,
  styles,
}: SeedPhraseConcealerProps) => {
  const { themeAppearance } = useTheme();

  return (
    <View style={styles.seedPhraseConcealerContainer}>
      <TouchableOpacity
        onPress={onReveal}
        style={styles.blurContainer}
        testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID}
      >
        <ImageBackground
          source={
            themeAppearance === AppThemeKey.dark ? darkBlurImage : blurImage
          }
          style={styles.blurView}
          resizeMode="cover"
        />
        <View style={styles.seedPhraseConcealer}>
          <Icon
            name={IconName.EyeSlash}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('manual_backup_step_1.reveal')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {strings('manual_backup_step_1.watching')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default SeedPhraseConcealer;
