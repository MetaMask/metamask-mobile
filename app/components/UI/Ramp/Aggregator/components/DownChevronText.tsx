import React from 'react';
import { StyleSheet } from 'react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    chevron: {
      marginLeft: 8,
    },
  });

interface Props {
  text?: string;
}

const DownChevronText = ({ text, ...props }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      {...props}
    >
      <Text variant={TextVariant.BodyMDBold}>{text}</Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.Alternative}
        style={styles.chevron}
      />
    </Box>
  );
};

export default DownChevronText;
