import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import Text, { TextVariant } from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { FlexDirection, AlignItems } from '../../Box/box.types';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { getNetworkImageSource } from '../../../../util/networks';
import { Hex } from '@metamask/utils';

const createStyles = () => StyleSheet.create({
    wrapper: {
      flex: 1
    },
    nameWrapper: {
      flex: 1,
    },
    childrenWrapper: {
      flex: 1,
    },
  });

interface NetworkRowProps {
  chainId: Hex;
  chainName: string;
  children?: React.ReactNode;
}

export const NetworkRow: React.FC<NetworkRowProps> = ({ chainId, chainName, children }) => {
  const { styles } = useStyles(createStyles, {});

  // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
  const imageSource = getNetworkImageSource({ chainId });

  return (
    <Box
      style={styles.wrapper}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
    >
      <Box
        style={styles.nameWrapper}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <AvatarNetwork
          imageSource={imageSource}
        />
        <Text variant={TextVariant.BodyLGMedium}>{chainName}</Text>
      </Box>

      {children ? (
        <Box
          style={styles.childrenWrapper}
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.flexEnd}
        >
          {children}
        </Box>
      ) : null}
    </Box>
  );
};
