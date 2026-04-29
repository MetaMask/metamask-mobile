import React from 'react';
import { ImageBackground, TouchableOpacity } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { AppThemeKey } from '../../../../util/theme/models';
import { useTheme } from '../../../../util/theme';
import blurImage from '../../../../images/blur.png';
import darkBlurImage from '../../../../images/dark-blur.png';
import { SeedPhraseConcealerProps } from '../types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const FILL_STYLE =
  'absolute top-0 left-0 bottom-0 right-0 h-full rounded-lg flex-1';

const SeedPhraseConcealer = ({
  onReveal,
  testID = RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
}: SeedPhraseConcealerProps) => {
  const { themeAppearance } = useTheme();
  const tw = useTailwind();

  return (
    <Box twClassName="flex-1 rounded-lg">
      <TouchableOpacity
        onPress={onReveal}
        style={tw.style(FILL_STYLE)}
        testID={testID}
      >
        <ImageBackground
          source={
            themeAppearance === AppThemeKey.dark ? darkBlurImage : blurImage
          }
          style={tw.style(FILL_STYLE, 'opacity-50')}
          resizeMode="cover"
        />
        <Box twClassName="items-center justify-center rounded-lg px-6 py-[45px] gap-y-4 h-full flex-1">
          <Icon
            name={IconName.EyeSlash}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('manual_backup_step_1.reveal')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            {strings('manual_backup_step_1.watching')}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default SeedPhraseConcealer;
