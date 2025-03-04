import React from 'react';
import { StyleSheet } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../../UI/Box/Box';
import Text, { TextColor, TextVariant } from '../../../component-library/components/Texts/Text';
import { FlexDirection } from '../../UI/Box/box.types';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { shadows } = theme;
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      padding: 16,
      minHeight: 76, // Height when content is present
      ...shadows.size.xs,
    },
    label: {
      color: theme.colors.text.alternative,
    },
    address: {
      color: theme.colors.text.default,
    },
  });
};

interface ReceiveAddressProps {
  address?: string;
}

export const ReceiveAddress: React.FC<ReceiveAddressProps> = ({ address }) => {
  const { styles } = useStyles(createStyles, {});

  if (!address) {
    return <Box style={styles.container}><></></Box>;
  }

  return (
    <Box style={styles.container}>
      <Box flexDirection={FlexDirection.Column} gap={4}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Receive at Solana account
        </Text>
        <Text variant={TextVariant.BodyLGMedium}>
          {address}
        </Text>
      </Box>
    </Box>
  );
};
