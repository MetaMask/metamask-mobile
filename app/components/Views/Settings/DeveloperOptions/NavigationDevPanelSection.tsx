import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import styleSheet from './DeveloperOptions.styles';

export default function NavigationDevPanelSection() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation();

  const handleOpen = useCallback(() => {
    // @ts-expect-error dev-only navigation to top-level route
    navigation.navigate(Routes.NAVIGATION_DEV_PANEL);
  }, [navigation]);

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'Navigation'}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {
          'Open a panel listing every MainNavigator route to compare navigation behavior.'
        }
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleOpen}
        isFullWidth
        style={styles.accessory}
      >
        {'Open Navigation Dev Panel'}
      </Button>
    </>
  );
}
