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
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import styleSheet from './DeveloperOptions.styles';

export const GLASS_DEPTH_OPEN_TEST_ID = 'glass-depth-open';

/**
 * Developer Options entry for the glass depth prototype. The screen is
 * registered on the same dev-options gate, so production settings never
 * show this row.
 */
const GlassDepthPrototypeSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation<AppNavigationProp>();

  const handleOpen = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.GLASS_DEPTH_PROTOTYPE);
  }, [navigation]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.glass_depth.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.glass_depth.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleOpen}
        isFullWidth
        style={styles.accessory}
        testID={GLASS_DEPTH_OPEN_TEST_ID}
      >
        {strings('app_settings.developer_options.glass_depth.open')}
      </Button>
    </>
  );
};

export default GlassDepthPrototypeSection;
