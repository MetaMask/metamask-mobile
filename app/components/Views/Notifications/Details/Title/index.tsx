import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import useStyles from '../useStyles';
import { NotificationDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Notifications/NotificationDetailsView.selectors';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, JustifyContent } from '../../../../UI/Box/box.types';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { styles } = useStyles();

  return (
    <Box
      style={styles.header}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.center}
    >
      <Box alignItems={AlignItems.center}>
        <Text
          testID={NotificationDetailsViewSelectorsIDs.TITLE}
          variant={TextVariant.HeadingSM}
          color={TextColor.Default}
          style={styles.titleText}
        >
          {title}
        </Text>
      </Box>
      <Box alignItems={AlignItems.center}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.subtitleText}
        >
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
