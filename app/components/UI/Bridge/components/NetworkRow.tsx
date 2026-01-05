import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { FlexDirection, AlignItems } from '../../Box/box.types';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { getNetworkImageSource } from '../../../../util/networks';
import { CaipChainId, Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    nameWrapper: {
      flex: 1,
    },
    childrenWrapper: {
      flex: 1,
    },
  });

interface NetworkRowProps {
  chainId: Hex | CaipChainId;
  chainName: string;
  showNoNetworkFeeLabel?: boolean;
  children?: React.ReactNode;
}

export const NetworkRow: React.FC<NetworkRowProps> = ({
  chainId,
  chainName,
  showNoNetworkFeeLabel,
  children,
}) => {
  const { styles } = useStyles(createStyles, {});

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
        <AvatarNetwork imageSource={imageSource} />
        <Box>
          <Text variant={TextVariant.BodyLGMedium}>{chainName}</Text>
          {showNoNetworkFeeLabel ? (
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('networks.no_network_fee')}
            </Text>
          ) : null}
        </Box>
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
