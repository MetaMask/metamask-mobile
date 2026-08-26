import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
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

const PRICE_RANGE_NETWORK_BADGE_SIZE = 8;
const PRICE_RANGE_TOKEN_TO_RANGE_GAP = 7;
const PRICE_RANGE_AVATAR_SIZE = 16;
const PRICE_RANGE_CHEVRON_SIZE = 16;
const PRICE_RANGE_CLUSTER_GAP = 4;
const PRICE_RANGE_CLUSTER_CHROME_WIDTH =
  PRICE_RANGE_AVATAR_SIZE +
  PRICE_RANGE_TOKEN_TO_RANGE_GAP +
  PRICE_RANGE_CHEVRON_SIZE +
  PRICE_RANGE_CLUSTER_GAP;

function PriceRangeValue({
  minLabel,
  maxLabel,
  shouldStack,
}: {
  minLabel: string;
  maxLabel: string;
  shouldStack: boolean;
}) {
  const oneLineLabel = `${minLabel} - ${maxLabel}`;

  if (shouldStack) {
    return (
      <Box
        testID={PriceRangeRowSelectorsIDs.VALUE}
        twClassName="min-w-0 shrink"
        style={{ marginLeft: PRICE_RANGE_TOKEN_TO_RANGE_GAP }}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          testID={PriceRangeRowSelectorsIDs.MIN_VALUE}
        >
          {minLabel}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          testID={PriceRangeRowSelectorsIDs.MAX_VALUE}
        >
          {maxLabel}
        </Text>
      </Box>
    );
  }

  return (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      numberOfLines={1}
      twClassName="min-w-0 shrink"
      style={{ marginLeft: PRICE_RANGE_TOKEN_TO_RANGE_GAP }}
      testID={PriceRangeRowSelectorsIDs.VALUE}
    >
      {oneLineLabel}
    </Text>
  );
}

const PriceRangeRow = ({
  token,
  minLabel,
  maxLabel,
  onPress,
}: PriceRangeRowProps) => {
  const tw = useTailwind();
  const [rowWidth, setRowWidth] = useState(0);
  const [oneLineWidth, setOneLineWidth] = useState(0);
  const oneLineLabel =
    minLabel && maxLabel ? `${minLabel} - ${maxLabel}` : undefined;

  useEffect(() => {
    setOneLineWidth(0);
  }, [oneLineLabel]);

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

  const availableOneLineWidth =
    rowWidth * 0.5 - PRICE_RANGE_CLUSTER_CHROME_WIDTH;
  const shouldStack =
    Boolean(minLabel && maxLabel && token) &&
    rowWidth > 0 &&
    oneLineWidth > availableOneLineWidth;

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
        onLayout={(event) => {
          setRowWidth(event.nativeEvent.layout.width);
        }}
      >
        {oneLineLabel ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            accessible={false}
            importantForAccessibility="no"
            numberOfLines={1}
            style={{ position: 'absolute', opacity: 0 }}
            onTextLayout={(event) => {
              const lineWidth = event.nativeEvent.lines[0]?.width;
              if (lineWidth) {
                setOneLineWidth(lineWidth);
              }
            }}
          >
            {oneLineLabel}
          </Text>
        ) : null}
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
          twClassName="shrink"
          style={{ maxWidth: '50%' }}
        >
          {minLabel && maxLabel && token ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="min-w-0 shrink"
            >
              <BadgeWrapper
                testID={PriceRangeRowSelectorsIDs.AVATAR}
                twClassName="self-center"
                position={BadgeWrapperPosition.BottomRight}
                badge={
                  <Box
                    twClassName="overflow-hidden border-2 border-background-default bg-default rounded-[2px]"
                    style={{
                      width: PRICE_RANGE_NETWORK_BADGE_SIZE,
                      height: PRICE_RANGE_NETWORK_BADGE_SIZE,
                    }}
                  >
                    {networkImageSource ? (
                      <Image
                        source={networkImageSource}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      />
                    ) : null}
                  </Box>
                }
              >
                <AvatarToken
                  name={token.symbol}
                  src={tokenImageSource}
                  size={AvatarTokenSize.Xs}
                />
              </BadgeWrapper>
              <PriceRangeValue
                minLabel={minLabel}
                maxLabel={maxLabel}
                shouldStack={shouldStack}
              />
            </Box>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              testID={PriceRangeRowSelectorsIDs.VALUE}
            >
              {strings('bridge.recurring.price_range.not_set')}
            </Text>
          )}
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
