import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../../util/networks';
import { getTokenImageSource } from '../../utils';
import { PriceRangeRowSelectorsIDs } from './PriceRangeRow.testIds';
import type { PriceRangeRowProps } from './PriceRangeRow.types';

const PriceRangeRow = ({ token, rangeLabel, onPress }: PriceRangeRowProps) => {
  const tw = useTailwind();
  const hasRangeLabel = Boolean(rangeLabel);

  const tokenImageSource = useMemo(
    () =>
      token
        ? getTokenImageSource(
            token.symbol,
            token.image,
            token.address,
            token.chainId,
          )
        : undefined,
    [token],
  );

  const networkImageSource = useMemo(
    () =>
      token ? getNetworkImageSource({ chainId: token.chainId }) : undefined,
    [token],
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={PriceRangeRowSelectorsIDs.ROW}
      style={({ pressed }) =>
        tw.style('w-full px-4 py-3', pressed && 'bg-pressed')
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="flex-1"
        >
          {strings('bridge.recurring.price_range.label')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          {hasRangeLabel && token ? (
            <BadgeWrapper
              testID={PriceRangeRowSelectorsIDs.AVATAR}
              position={BadgeWrapperPosition.BottomRight}
              badge={
                <BadgeNetwork
                  twClassName="rounded-md"
                  src={networkImageSource}
                />
              }
            >
              <AvatarToken
                name={token.symbol}
                src={tokenImageSource}
                size={AvatarTokenSize.Xs}
              />
            </BadgeWrapper>
          ) : null}
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={
              hasRangeLabel ? TextColor.TextDefault : TextColor.TextAlternative
            }
            testID={PriceRangeRowSelectorsIDs.VALUE}
          >
            {rangeLabel ?? strings('bridge.recurring.price_range.not_set')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </Box>
    </Pressable>
  );
};

export default PriceRangeRow;
