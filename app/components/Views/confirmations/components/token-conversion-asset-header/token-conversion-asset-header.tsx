import React, { useCallback, useRef, useState } from 'react';
import { NativeSyntheticEvent, TextLayoutEventData, View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../util/networks';
import BigNumber from 'bignumber.js';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { AssetType } from '../../types/token';
import styleSheet from './token-conversion-asset-header.styles';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../hooks/pay/useTransactionPayData';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import { useNetworkName } from '../../hooks/useNetworkName';

export const TokenConversionAssetHeaderTestIds = {
  ASSET_HEADER_SKELETON: 'token-conversion-asset-header-skeleton',
  ASSET_HEADER_INPUT: 'token-conversion-asset-header-input',
  ASSET_HEADER_OUTPUT: 'token-conversion-asset-header-output',
  INPUT_TOKEN_AVATAR: 'token-conversion-asset-header-input-token-avatar',
  OUTPUT_TOKEN_AVATAR: 'token-conversion-asset-header-output-token-avatar',
} as const;

export const TokenConversionAssetHeaderSkeleton = ({
  isStackedLayout = false,
}: {
  isStackedLayout?: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={[
        styles.assetHeaderContainer,
        isStackedLayout
          ? styles.assetHeaderContainerStacked
          : styles.assetHeaderContainerHorizontal,
      ]}
      testID={TokenConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON}
    >
      <View
        style={[
          styles.assetContainer,
          isStackedLayout
            ? styles.assetContainerStacked
            : styles.assetContainerHorizontal,
          !isStackedLayout && styles.assetContainerHorizontalInput,
        ]}
      >
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View
          style={[
            styles.assetInfo,
            styles.assetInfoSkeleton,
            isStackedLayout
              ? styles.assetInfoStacked
              : styles.assetInfoHorizontal,
          ]}
        >
          <Skeleton
            width={56}
            height={14}
            style={styles.skeletonBorderRadius}
          />
          <Skeleton
            width={65}
            height={20}
            style={styles.skeletonBorderRadius}
          />
        </View>
      </View>
      <Icon
        name={isStackedLayout ? IconName.Arrow2Down : IconName.Arrow2Right}
        color={IconColor.IconAlternative}
        size={IconSize.Lg}
        style={styles.assetDirectionIcon}
      />
      <View
        style={[
          styles.assetContainer,
          isStackedLayout
            ? styles.assetContainerStacked
            : styles.assetContainerHorizontal,
          !isStackedLayout && styles.assetContainerHorizontalOutput,
        ]}
      >
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View
          style={[
            styles.assetInfo,
            styles.assetInfoSkeleton,
            isStackedLayout
              ? styles.assetInfoStacked
              : styles.assetInfoHorizontal,
          ]}
        >
          <Skeleton
            width={56}
            height={14}
            style={styles.skeletonBorderRadius}
          />
          <Skeleton
            width={65}
            height={20}
            style={styles.skeletonBorderRadius}
          />
        </View>
      </View>
    </View>
  );
};

/**
 * Renders input/output token assets horizontally by default. If either fiat
 * amount text overflows (wraps to 2+ lines), switches to a stacked vertical
 * layout.
 */
export const TokenConversionAssetHeader = ({
  inputToken,
  outputToken,
  formatFiat,
}: {
  inputToken: AssetType;
  outputToken: AssetType;
  formatFiat: (value: BigNumber) => string;
}) => {
  const { styles } = useStyles(styleSheet, {});

  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const [isStackedLayout, setIsStackedLayout] = useState(false);
  const [isLayoutResolved, setIsLayoutResolved] = useState(false);
  const measuredTextKeysRef = useRef<Record<string, true>>({});

  const inputTokenAmount = totals?.sourceAmount?.usd;
  const outputTokenAmount = totals?.targetAmount?.usd;

  const inputNetworkName = useNetworkName(inputToken?.chainId as Hex);
  const outputNetworkName = useNetworkName(outputToken?.chainId as Hex);

  const formatAmount = (amount?: string) => {
    if (!amount) {
      return '';
    }

    return formatFiat(new BigNumber(amount));
  };

  const handleTextLayout = useCallback(
    (
      textKey: 'inputAmount' | 'outputAmount',
      event: NativeSyntheticEvent<TextLayoutEventData>,
    ) => {
      // If text is rendered on more than one line, switch to stacked layout
      if (!isStackedLayout && event.nativeEvent.lines.length > 1) {
        setIsStackedLayout(true);
      }

      if (!measuredTextKeysRef.current[textKey]) {
        measuredTextKeysRef.current[textKey] = true;
        if (Object.keys(measuredTextKeysRef.current).length === 2) {
          setIsLayoutResolved(true);
        }
      }
    },
    [isStackedLayout],
  );

  const shouldShowSkeleton = isLoading || !isLayoutResolved;

  const assetHeaderContent = (
    <View
      style={[
        styles.assetHeaderContainer,
        isStackedLayout
          ? styles.assetHeaderContainerStacked
          : styles.assetHeaderContainerHorizontal,
        shouldShowSkeleton && styles.hiddenMeasurementContent,
      ]}
      pointerEvents={shouldShowSkeleton ? 'none' : 'auto'}
    >
      <View
        style={[
          styles.assetContainer,
          isStackedLayout
            ? styles.assetContainerStacked
            : styles.assetContainerHorizontal,
          !isStackedLayout && styles.assetContainerHorizontalInput,
        ]}
        testID={TokenConversionAssetHeaderTestIds.ASSET_HEADER_INPUT}
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={inputNetworkName}
              imageSource={getNetworkImageSource({
                chainId: inputToken?.chainId ?? '',
              })}
            />
          }
        >
          <AvatarToken
            name={inputToken.symbol}
            imageSource={{ uri: inputToken.image }}
            size={AvatarSize.Lg}
            testID={TokenConversionAssetHeaderTestIds.INPUT_TOKEN_AVATAR}
          />
        </BadgeWrapper>
        <View
          style={[
            styles.assetInfo,
            isStackedLayout
              ? styles.assetInfoStacked
              : styles.assetInfoHorizontal,
          ]}
        >
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
            numberOfLines={isStackedLayout ? undefined : 2}
            ellipsizeMode="tail"
          >
            {inputToken?.symbol}
          </Text>
          <Text
            style={styles.assetAmount}
            numberOfLines={isStackedLayout ? undefined : 2}
            ellipsizeMode="tail"
            onTextLayout={(e) => handleTextLayout('inputAmount', e)}
          >
            {formatAmount(inputTokenAmount)}
          </Text>
        </View>
      </View>
      <Icon
        name={isStackedLayout ? IconName.Arrow2Down : IconName.Arrow2Right}
        color={IconColor.IconAlternative}
        size={IconSize.Lg}
        style={styles.assetDirectionIcon}
      />
      <View
        style={[
          styles.assetContainer,
          isStackedLayout
            ? styles.assetContainerStacked
            : styles.assetContainerHorizontal,
          !isStackedLayout && styles.assetContainerHorizontalOutput,
        ]}
        testID={TokenConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT}
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={outputNetworkName}
              imageSource={getNetworkImageSource({
                chainId: outputToken?.chainId ?? '',
              })}
            />
          }
        >
          <AvatarToken
            name={outputToken.symbol}
            imageSource={{ uri: outputToken.image }}
            size={AvatarSize.Lg}
            testID={TokenConversionAssetHeaderTestIds.OUTPUT_TOKEN_AVATAR}
          />
        </BadgeWrapper>
        <View
          style={[
            styles.assetInfo,
            isStackedLayout
              ? styles.assetInfoStacked
              : styles.assetInfoHorizontal,
          ]}
        >
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
            numberOfLines={isStackedLayout ? undefined : 2}
            ellipsizeMode="tail"
          >
            {outputToken.symbol}
          </Text>
          <Text
            style={styles.assetAmount}
            numberOfLines={isStackedLayout ? undefined : 2}
            ellipsizeMode="tail"
            onTextLayout={(e) => handleTextLayout('outputAmount', e)}
          >
            {formatAmount(outputTokenAmount)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (shouldShowSkeleton) {
    return (
      <View style={styles.measurementContainer}>
        <TokenConversionAssetHeaderSkeleton isStackedLayout={isStackedLayout} />
        {assetHeaderContent}
      </View>
    );
  }

  return assetHeaderContent;
};
