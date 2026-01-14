import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import useStyles from '../useStyles';
import { NotificationDetailsViewSelectorsIDs } from '../NotificationDetailsView.testIds';
import { Box } from '../../../../UI/Box/Box';

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { styles } = useStyles();

  return (
    <Box style={styles.header}>
      <Box>
        <Text
          testID={NotificationDetailsViewSelectorsIDs.TITLE}
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Default}
        >
          {title}
        </Text>
      </Box>
      <Box>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
