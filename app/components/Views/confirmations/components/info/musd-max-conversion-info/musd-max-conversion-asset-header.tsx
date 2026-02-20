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
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';

export const MusdMaxConversionAssetHeaderTestIds = {
  ASSET_HEADER_SKELETON: 'musd-max-conversion-asset-header-skeleton',
  ASSET_HEADER_INPUT: 'musd-max-conversion-asset-header-input',
  ASSET_HEADER_OUTPUT: 'musd-max-conversion-asset-header-output',
} as const;

export const MusdMaxConversionAssetHeaderSkeleton = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.assetHeaderContainer}
      testID={MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON}
    >
      <View style={styles.assetContainer}>
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
      <Icon
        name={IconName.Arrow2Down}
        color={IconColor.IconAlternative}
        size={IconSize.Lg}
      />
      <View style={styles.assetContainer}>
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
    </View>
  );
};

export const MusdMaxConversionAssetHeader = memo(
  ({
    token,
    networkName,
    formatFiat,
  }: {
    token: AssetType;
    networkName: string;
    formatFiat: (value: BigNumber) => string;
  }) => {
    const { styles } = useStyles(styleSheet, {});
    const isLoading = useIsTransactionPayLoading();

    const fiatBalanceText = useMemo(() => {
      if (!token?.fiat?.balance) {
        return '';
      }

      return formatFiat(new BigNumber(token.fiat.balance));
    }, [formatFiat, token?.fiat?.balance]);

    if (isLoading) {
      return <MusdMaxConversionAssetHeaderSkeleton />;
    }

    return (
      <View style={styles.assetHeaderContainer}>
        {/* Input Asset (Top) */}
        <View
          style={styles.assetContainer}
          testID={MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_INPUT}
        >
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
        <Icon
          name={IconName.Arrow2Down}
          color={IconColor.IconAlternative}
          size={IconSize.Lg}
        />
        {/* Output Asset (Bottom) */}
        <View
          style={styles.assetContainer}
          testID={MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT}
        >
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
              name={MUSD_TOKEN.symbol}
              imageSource={MUSD_TOKEN.imageSource}
              size={AvatarSize.Lg}
              testID={`earn-token-avatar-${MUSD_TOKEN.symbol}`}
            />
          </BadgeWrapper>
          <View style={styles.assetInfo}>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {MUSD_TOKEN.symbol}
            </Text>
            <Text style={styles.assetAmount}>{fiatBalanceText}</Text>
          </View>
        </View>
      </View>
    );
  },
);
