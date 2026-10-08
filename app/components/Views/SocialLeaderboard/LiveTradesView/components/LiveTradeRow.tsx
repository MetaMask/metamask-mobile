import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useSocialEntryOptions } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import { getSocialEntryOptionsTriggerTestId } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import SocialTraderIdentityRow from '../../../../UI/SocialFeed/components/SocialTraderIdentityRow';
import LiveTradeCardTitle from './LiveTradeCardTitle';
import type { LiveTradeRowModel } from '../types';
import LiveTradeCardSurface from './LiveTradeCardSurface';
import {
  getLiveTradeAmountTestId,
  getLiveTradeCardTestId,
  getLiveTradeMarkPriceTestId,
  getLiveTradeRowTestId,
  getLiveTradeValueTestId,
} from './LiveTradeRow.testIds';

/** Lines the card up with the identity text: avatar (32) plus its gap-2 (8). */
const CARD_INDENT_CLASSNAME = 'ml-10';

export interface LiveTradeRowProps {
  item: LiveTradeRowModel;
  onPositionPress: (item: LiveTradeRowModel) => void;
  onTraderPress: (item: LiveTradeRowModel) => void;
  now?: number;
}

/**
 * Compact Social V1 Live trades row: shared trader identity plus a gradient
 * trade card showing unit price and token amount.
 */
const LiveTradeRow: React.FC<LiveTradeRowProps> = ({
  item,
  onPositionPress,
  onTraderPress,
  now,
}) => {
  const tw = useTailwind();
  const {
    open: openOptions,
    sheet: optionsSheet,
    isHidden,
  } = useSocialEntryOptions({
    postId: item.id,
    authorId: item.traderId,
    authorHandle: item.authorHandle,
  });

  const handlePositionPress = useCallback(() => {
    onPositionPress(item);
  }, [item, onPositionPress]);

  const handleTraderPress = useCallback(() => {
    onTraderPress(item);
  }, [item, onTraderPress]);

  if (isHidden) {
    return null;
  }

  return (
    <Box twClassName="px-4 py-3 gap-3" testID={getLiveTradeRowTestId(item.id)}>
      <SocialTraderIdentityRow
        author={item.author}
        handle={item.authorHandle}
        imageUrl={item.authorImageUrl}
        timestampMs={item.timestampMs}
        recyclingKey={item.id}
        onMorePress={openOptions}
        onIdentityPress={handleTraderPress}
        now={now}
        testIDs={{
          more: getSocialEntryOptionsTriggerTestId(item.id),
          identityPress: `live-trade-trader-${item.id}`,
        }}
      />
      <Pressable
        onPress={handlePositionPress}
        accessibilityRole="button"
        accessibilityLabel={item.symbol}
        testID={getLiveTradeCardTestId(item.id)}
        style={({ pressed }) =>
          tw.style(CARD_INDENT_CLASSNAME, pressed && 'opacity-60')
        }
      >
        <LiveTradeCardSurface>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            <PositionTokenAvatar
              position={item.avatar}
              size={AvatarTokenSize.Md}
              showChainBadge
            />
            <Box twClassName="flex-1 min-w-0">
              <LiveTradeCardTitle
                symbol={item.symbol}
                direction={item.direction}
                leverageLabel={item.leverageLabel}
                side={item.side}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={getLiveTradeMarkPriceTestId(item.id)}
              >
                {item.markPriceLabel}
              </Text>
            </Box>
            <Box alignItems={BoxAlignItems.End} twClassName="shrink-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                testID={getLiveTradeValueTestId(item.id)}
              >
                {item.valueLabel}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={getLiveTradeAmountTestId(item.id)}
              >
                {item.amountLabel}
              </Text>
            </Box>
          </Box>
        </LiveTradeCardSurface>
      </Pressable>
      {optionsSheet}
    </Box>
  );
};

export default React.memo(LiveTradeRow);
