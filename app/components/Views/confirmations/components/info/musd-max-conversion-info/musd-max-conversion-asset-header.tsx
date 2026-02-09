import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../util/networks';
import BigNumber from 'bignumber.js';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { AssetType } from '../../../types/token';
import styleSheet from './musd-max-conversion-asset-header.styles';

export const MusdMaxConversionAssetHeaderSkeleton = memo(
  ({ testID }: { testID?: string }) => {
    const { styles } = useStyles(styleSheet, {});

    return (
      <View style={styles.container} testID={testID}>
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View style={[styles.assetInfo, styles.assetInfoSkeleton]}>
          <Skeleton
            width={56}
            height={14}
            style={styles.skeletonBorderRadius}
          />
          <Skeleton
            width={140}
            height={20}
            style={styles.skeletonBorderRadius}
          />
        </View>
      </View>
    );
  },
);

export const MusdMaxConversionAssetHeader = memo(
  ({
    token,
    networkName,
    formatFiat,
    testID,
  }: {
    token: AssetType;
    networkName: string;
    formatFiat: (value: BigNumber) => string;
    testID?: string;
  }) => {
    const { styles } = useStyles(styleSheet, {});

    const fiatBalanceText = useMemo(() => {
      if (!token?.fiat?.balance) {
        return '';
      }

      return formatFiat(new BigNumber(token.fiat.balance));
    }, [formatFiat, token?.fiat?.balance]);

    return (
      <View style={styles.container} testID={testID}>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={networkName}
              imageSource={getNetworkImageSource({
                chainId: token?.chainId ?? '',
              })}
            />
          }
        >
          <AvatarToken
            name={token.symbol}
            imageSource={{ uri: token.image }}
            size={AvatarSize.Lg}
            testID={`earn-token-avatar-${token.symbol}`}
          />
        </BadgeWrapper>
        <View style={styles.assetInfo}>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {token?.symbol}
          </Text>
          <Text style={styles.assetAmount}>{fiatBalanceText}</Text>
        </View>
      </View>
    );
  },
);
