import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import styleSheet from './DeveloperOptions.styles';

/**
 * ICON LAB — temporary entry point for the icon-library experiment.
 * Remove alongside app/components/Views/Settings/IconLab.
 */
export default function IconLabDeveloperOptionsSection() {
  const navigation = useNavigation<AppNavigationProp>();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleOpenIconLab = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.ICON_LAB);
  }, [navigation]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.icon_lab')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.icon_lab_desc')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleOpenIconLab}
        isFullWidth
        style={styles.accessory}
        testID="developer-options-icon-lab"
      >
        {strings('app_settings.developer_options.icon_lab_open')}
      </Button>
    </>
  );
}
