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
import { Box } from '../../../Box/Box';
import { Hex, CaipChainId } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { StyleSheet } from 'react-native';
import TokenIcon from '../../../../Base/TokenIcon';
import { BridgeToken } from '../../types';
import { TransactionType } from '@metamask/transaction-controller';
import {
  AllowedBridgeChainIds,
  isNativeAddress,
} from '@metamask/bridge-controller';

const styles = StyleSheet.create({
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
  token: BridgeToken;
  tokenAmount: string;
  chainId: Hex | CaipChainId;
  txType: TransactionType;
}

const TransactionAsset = ({
  token,
  tokenAmount,
  chainId,
  txType,
}: TransactionAssetProps) => {
  const networkName =
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[chainId as AllowedBridgeChainIds];
  const networkImageSource = getNetworkImageSource({ chainId });

  // Solana native SOL will also be the zero address for quote data from Bridge API only!
  // Other formats might look like solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  const isNative = isNativeAddress(token.address);

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
        {isNative ? (
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
        {txType === TransactionType.bridge && (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
            style={styles.networkName}
          >
            {networkName}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default TransactionAsset;
