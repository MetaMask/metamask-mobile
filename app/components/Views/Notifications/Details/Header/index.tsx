import React from 'react';
import { View } from 'react-native';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from '../styles';
import NotificationsDetailViewSelectorsIDs from '../../constants';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      testID={
        NotificationsDetailViewSelectorsIDs.NOTIFICATIONS_HEADER_CONTAINER_ID
      }
      style={styles.header}
    >
      <Text
        testID={
          NotificationsDetailViewSelectorsIDs.NOTIFICATIONS_HEADER_TITLE_ID
        }
        variant={TextVariant.BodyLGMedium}
        color={TextColor.Default}
      >
        {title}
      </Text>
      <Text
        testID={
          NotificationsDetailViewSelectorsIDs.NOTIFICATIONS_HEADER_SUBTITLE_ID
        }
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
      >
        {subtitle}
      </Text>
    </View>
  );
};

export default Header;
