import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      padding: 24,
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
  });
};

export const BridgeTokenSelector = () => {
  const { styles } = useStyles(createStyles, {});

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>Tokens</Text>
        </BottomSheetHeader>
        <Box>
          <Text variant={TextVariant.BodyMD}>Token content will go here</Text>
        </Box>
      </Box>
    </BottomSheet>
  );
};
