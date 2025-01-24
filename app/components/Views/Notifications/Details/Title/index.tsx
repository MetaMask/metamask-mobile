import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import NotificationsDetailViewSelectorsIDs from '../../constants';
import useStyles from '../useStyles';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { styles } = useStyles();

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
        style={styles.headerText}
      >
        {title}
      </Text>
      <Text
        testID={
          NotificationsDetailViewSelectorsIDs.NOTIFICATIONS_HEADER_SUBTITLE_ID
        }
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.headerText}
      >
        {subtitle}
      </Text>
    </View>
  );
};

export default Header;
