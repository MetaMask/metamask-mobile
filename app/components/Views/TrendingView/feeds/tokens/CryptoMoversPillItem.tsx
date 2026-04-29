import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { isCaipChainId } from '@metamask/utils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { TimeOption } from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
  getPriceChangeFieldKey,
} from '../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import TrendingTokenLogo from '../../../../UI/Trending/components/TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useTrendingTokenPress } from '../../../../UI/Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';
import { CRYPTO_MOVERS_HOME_FILTER_CONTEXT } from '../search-utils';

const LOGO_SIZE = 24;

interface CryptoMoversPillItemProps {
  token: TrendingAsset;
  index: number;
}

const CryptoMoversPillItem: React.FC<CryptoMoversPillItemProps> = ({
  token,
  index,
}) => {
  const tw = useTailwind();
  const { onPress } = useTrendingTokenPress({
    token,
    index,
    filterContext: CRYPTO_MOVERS_HOME_FILTER_CONTEXT,
  });

  const networkBadgeImageSource = useMemo(() => {
    const caipChainId = getCaipChainIdFromAssetId(token.assetId);
    if (!isCaipChainId(caipChainId)) return undefined;
    return getNetworkBadgeSource(caipChainId);
  }, [token.assetId]);

  const { changeLabel, textColor, showChange } = useMemo(() => {
    const key = getPriceChangeFieldKey(TimeOption.TwentyFourHours);
    const raw = token.priceChangePct?.[key];
    const n = raw !== undefined && raw !== null ? parseFloat(String(raw)) : NaN;
    if (isNaN(n)) {
      return {
        changeLabel: undefined as string | undefined,
        textColor: TextColor.TextAlternative,
        showChange: false,
      };
    }
    if (n === 0) {
      return {
        changeLabel: '0.00%',
        textColor: TextColor.TextAlternative,
        showChange: true,
      };
    }
    return {
      changeLabel: `${n > 0 ? '+' : ''}${n.toFixed(2)}%`,
      textColor:
        n > 0
          ? TextColor.SuccessDefault
          : n < 0
            ? TextColor.ErrorDefault
            : TextColor.TextAlternative,
      showChange: true,
    };
  }, [token.priceChangePct]);

  return (
    <Pressable
      onPress={onPress}
      testID={`section-pill-${token.assetId}`}
      accessibilityRole="button"
      style={({ pressed }) => tw.style('shrink', pressed && 'opacity-80')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        paddingHorizontal={3}
        paddingVertical={2}
        twClassName="rounded-full"
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkBadgeImageSource}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={LOGO_SIZE}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {token.symbol}
        </Text>
        {showChange && changeLabel !== undefined ? (
          <Text
            variant={TextVariant.BodySm}
            color={textColor}
            numberOfLines={1}
          >
            {changeLabel}
          </Text>
        ) : null}
      </Box>
    </Pressable>
  );
};

export default React.memo(CryptoMoversPillItem);
