import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../Box/box.types';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { TokenI } from '../../../Tokens/types';
import { Box } from '../../../Box/Box';
import { Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  AllowedBridgeChainIds,
  NETWORK_TO_SHORT_NETWORK_NAME_MAP,
} from '../../../../../constants/bridge';
import { StyleSheet } from 'react-native';
import TokenIcon from '../../../Swaps/components/TokenIcon';

const createStyles = () =>
  StyleSheet.create({
    tokenIcon: {
      width: 40,
      height: 40,
    },
    tokenInfo: {
      flex: 1,
      marginLeft: 12,
      marginTop: -6,
    },
    infoButton: {
      marginRight: 12,
    },
    container: {
      padding: 4,
    },
    networkName: {
      marginTop: -2,
    },
  });

interface TransactionAssetProps {
  token: TokenI;
  tokenAmount: string;
  chainId: Hex;
}

const TransactionAsset = ({
  token,
  tokenAmount,
  chainId,
}: TransactionAssetProps) => {
  const styles = createStyles();
  const networkName =
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[chainId as AllowedBridgeChainIds];
  //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
  const networkImageSource = getNetworkImageSource({ chainId });

  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={networkImageSource}
          />
        }
      >
        {token.isNative ? (
          <TokenIcon
            symbol={token.symbol}
            icon={token.image}
            style={styles.tokenIcon}
            big={false}
            biggest={false}
            testID={`network-logo-${token.symbol}`}
          />
        ) : (
          <AvatarToken
            name={token.symbol}
            imageSource={token.image ? { uri: token.image } : undefined}
            size={AvatarSize.Md}
          />
        )}
      </BadgeWrapper>
      <Box
        style={styles.tokenInfo}
        flexDirection={FlexDirection.Column}
        gap={2}
      >
        <Text variant={TextVariant.BodyLGMedium}>
          {tokenAmount} {token.symbol}
        </Text>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Alternative}
          style={styles.networkName}
        >
          {networkName}
        </Text>
      </Box>
    </Box>
  );
};

export default TransactionAsset;
