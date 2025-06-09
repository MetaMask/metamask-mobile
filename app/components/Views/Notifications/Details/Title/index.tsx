import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import useStyles from '../useStyles';
import { NotificationDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Notifications/NotificationDetailsView.selectors';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { styles } = useStyles();

  return (
    <View style={styles.header}>
      <Text
        testID={NotificationDetailsViewSelectorsIDs.TITLE}
        variant={TextVariant.BodyLGMedium}
        color={TextColor.Default}
        style={styles.headerText}
      >
        {title}
      </Text>
      <Text
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
