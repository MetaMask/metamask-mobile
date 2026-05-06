import React, { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { isCaipChainId } from '@metamask/utils';
import { TextColor } from '@metamask/design-system-react-native';
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
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { CRYPTO_MOVERS_HOME_FILTER_CONTEXT } from '../search-utils';
import ExplorePill from '../../components/ExplorePill';

const LOGO_SIZE = 24;

interface CryptoMoversPillItemProps {
  token: TrendingAsset;
  index: number;
  /** Called synchronously before the card's press handler fires. */
  onCardPress?: () => void;
}

const CryptoMoversPillItem: React.FC<CryptoMoversPillItemProps> = ({
  token,
  index,
  onCardPress,
}) => {
  const { onPress: defaultOnPress } = useTrendingTokenPress({
    token,
    index,
    filterContext: CRYPTO_MOVERS_HOME_FILTER_CONTEXT,
    tokenDetailsSource: TokenDetailsSource.ExploreNowMovers,
  });

  const onPress = React.useCallback(async () => {
    onCardPress?.();
    await defaultOnPress();
  }, [onCardPress, defaultOnPress]);

  const networkBadgeImageSource = useMemo(() => {
    const caipChainId = getCaipChainIdFromAssetId(token.assetId);
    if (!isCaipChainId(caipChainId)) return undefined;
    return getNetworkBadgeSource(caipChainId);
  }, [token.assetId]);

  const { changeLabel, changeTextColor } = useMemo(() => {
    const key = getPriceChangeFieldKey(TimeOption.TwentyFourHours);
    const raw = token.priceChangePct?.[key];
    const n = raw !== undefined && raw !== null ? parseFloat(String(raw)) : NaN;
    if (isNaN(n)) {
      return {
        changeLabel: undefined as string | undefined,
        changeTextColor: TextColor.TextAlternative,
      };
    }
    if (n === 0) {
      return {
        changeLabel: '0.00%',
        changeTextColor: TextColor.TextAlternative,
      };
    }
    return {
      changeLabel: `${n > 0 ? '+' : ''}${n.toFixed(2)}%`,
      changeTextColor:
        n > 0
          ? TextColor.SuccessDefault
          : n < 0
            ? TextColor.ErrorDefault
            : TextColor.TextAlternative,
    };
  }, [token.priceChangePct]);

  const leading = useMemo(
    () => (
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
    ),
    [networkBadgeImageSource, token.assetId, token.symbol],
  );

  return (
    <ExplorePill
      onPress={onPress}
      testID={`section-pill-${token.assetId}`}
      leading={leading}
      title={token.symbol}
      changeLabel={changeLabel}
      changeTextColor={changeTextColor}
    />
  );
};

export default React.memo(CryptoMoversPillItem);
