import React from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
} from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice } from './formatAskPrice';
import { formatVolume } from './formatVolume';

export const EVENT_CARD_VISIBLE_MARKET_COUNT = 3;

interface RootProps {
  children: React.ReactNode;
  testID?: string;
}

const Root = ({ children, testID }: RootProps) => (
  <Box
    twClassName="m-4 gap-3 rounded-xl border border-muted p-4"
    testID={testID}
  >
    {children}
  </Box>
);

const Pressable = ({ children, ...props }: PressableProps) => (
  <NativePressable {...props}>{children}</NativePressable>
);

interface OutcomeProps {
  event: PredictEvent;
  market: PredictMarket;
  outcome: PredictOutcome;
  label?: string;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  testID?: string;
}

const Outcome = ({
  event,
  market,
  outcome,
  label = outcome.label,
  onOrder,
  testID,
}: OutcomeProps) => {
  const price = formatAskPrice(outcome.askPrice);
  return (
    <Button
      testID={testID}
      size={ButtonSize.Sm}
      variant={ButtonVariant.Secondary}
      isDisabled={!onOrder}
      onPress={() => onOrder?.(event, market, outcome)}
    >
      {price ? `${label} ${price}` : label}
    </Button>
  );
};

const Title = ({ children }: { children: React.ReactNode }) => (
  <Text variant={TextVariant.HeadingSm}>{children}</Text>
);

const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
    {children}
  </Text>
);

const Image = ({ source }: { source: string }) => {
  const tw = useTailwind();
  return (
    <ExpoImage
      source={source}
      style={tw.style('w-10 h-10 rounded-md')}
      contentFit="cover"
      recyclingKey={source}
    />
  );
};

interface FooterProps {
  event: PredictEvent;
  onPress?: () => void;
  testID?: string;
}

const Footer = ({ event, onPress, testID }: FooterProps) => {
  const volume = formatVolume(event.volume);
  const hiddenCount = Math.max(
    0,
    event.markets.length - EVENT_CARD_VISIBLE_MARKET_COUNT,
  );

  if (!event.category && volume === undefined && hiddenCount === 0) {
    return null;
  }

  return (
    <Box
      twClassName="flex-row items-center justify-between"
      testID={
        testID ?? `predict-next-event-footer-${event.venueId}-${event.id}`
      }
    >
      <Box twClassName="flex-1 flex-row items-center gap-3">
        {event.category ? (
          <Tag
            severity={TagSeverity.Neutral}
            testID={`predict-next-event-category-${event.id}`}
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {event.category}
            </Text>
          </Tag>
        ) : null}
        {volume !== undefined ? (
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            testID={`predict-next-event-volume-${event.id}`}
          >
            ${volume} Vol
          </Text>
        ) : null}
      </Box>
      {hiddenCount > 0 ? (
        <NativePressable
          accessibilityLabel={`+${hiddenCount} more`}
          accessibilityRole="button"
          onPress={onPress}
          testID={`predict-next-event-more-${event.id}`}
        >
          <Box twClassName="flex-row items-center">
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              +{hiddenCount} more
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Xs}
              color={IconColor.IconAlternative}
            />
          </Box>
        </NativePressable>
      ) : null}
    </Box>
  );
};

export const EventCard = {
  Root,
  Pressable,
  Outcome,
  Title,
  Subtitle,
  Image,
  Footer,
};
