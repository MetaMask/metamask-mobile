import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
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
import { TimeOption } from '../../../../../../UI/Trending/components/TrendingTokensBottomSheet';
import { getPriceChangeFieldKey } from '../../../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import TrendingTokenLogo from '../../../../../../UI/Trending/components/TrendingTokenLogo';

const LOGO_SIZE = 20;

export interface SectionPillProps {
  token: TrendingAsset;
  onPress: () => void;
  testID: string;
}

const SectionPill: React.FC<SectionPillProps> = ({
  token,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

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
      testID={testID}
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
        <TrendingTokenLogo
          assetId={token.assetId}
          symbol={token.symbol}
          size={LOGO_SIZE}
          recyclingKey={token.assetId}
        />
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

export default React.memo(SectionPill);
