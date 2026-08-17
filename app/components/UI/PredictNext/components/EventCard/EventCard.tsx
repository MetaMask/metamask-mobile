import React from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
} from 'react-native';
import {
  Box,
  Button,
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
import { formatMultiplier } from './formatMultiplier';
import { formatVolume } from './formatVolume';
import { getAskPricePercent } from './getAskPricePercent';

export const EVENT_CARD_VISIBLE_MARKET_COUNT = 3;

export type OutcomeRowColor = 'green' | 'indigo' | 'red';

export const BINARY_OUTCOME_ROW_COLORS: Record<'yes' | 'no', OutcomeRowColor> =
  {
    yes: 'green',
    no: 'red',
  };

export const MULTI_OUTCOME_ROW_COLORS: readonly OutcomeRowColor[] = [
  'green',
  'indigo',
  'red',
];

const OUTCOME_ROW_FILL: Record<OutcomeRowColor, string> = {
  green: 'bg-success-default',
  indigo: 'bg-info-default',
  red: 'bg-error-default',
};

const OUTCOME_ROW_TEXT: Record<OutcomeRowColor, TextColor> = {
  green: TextColor.SuccessInverse,
  indigo: TextColor.InfoInverse,
  red: TextColor.ErrorInverse,
};

interface RootProps {
  children: React.ReactNode;
  testID?: string;
}

const Root = ({ children, testID }: RootProps) => (
  <Box twClassName="gap-3 rounded-2xl bg-section p-4 pt-3" testID={testID}>
    {children}
  </Box>
);

const Pressable = ({ children, ...props }: PressableProps) => (
  <NativePressable {...props}>{children}</NativePressable>
);

interface OutcomeRowProps {
  event: PredictEvent;
  market: PredictMarket;
  outcome: PredictOutcome;
  color: OutcomeRowColor;
  label?: string;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  testID?: string;
}

const OutcomeRow = ({
  event,
  market,
  outcome,
  color,
  label = outcome.label,
  onOrder,
  testID,
}: OutcomeRowProps) => {
  const price = formatAskPrice(outcome.askPrice);
  const multiplier = formatMultiplier(outcome.askPrice);
  const percent = getAskPricePercent(outcome.askPrice);
  const fillClassName = OUTCOME_ROW_FILL[color];

  return (
    <Box twClassName="flex-row items-center gap-3">
      <Box twClassName="min-w-0 flex-1 gap-2">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {label}
        </Text>
        {percent !== undefined ? (
          <Box
            testID={testID ? `${testID}-bar` : undefined}
            twClassName={`h-0.5 rounded-full ${fillClassName}`}
            style={{ width: `${percent}%` }}
          />
        ) : null}
      </Box>
      {multiplier ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-right"
        >
          {multiplier}
        </Text>
      ) : null}
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        onPress={() => onOrder?.(event, market, outcome)}
        twClassName={`w-16 px-0 ${fillClassName}`}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={OUTCOME_ROW_TEXT[color]}
        >
          {price ?? '-'}
        </Text>
      </Button>
    </Box>
  );
};

const Title = ({ children }: { children: React.ReactNode }) => (
  <Text variant={TextVariant.HeadingSm} numberOfLines={2} twClassName="flex-1">
    {children}
  </Text>
);

const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
    {children}
  </Text>
);

const Image = ({ source, testID }: { source: string; testID?: string }) => {
  const tw = useTailwind();
  return (
    <Box testID={testID}>
      <ExpoImage
        source={source}
        style={tw.style('h-10 w-10 rounded-lg')}
        contentFit="cover"
        recyclingKey={source}
      />
    </Box>
  );
};

interface HeaderProps {
  event: PredictEvent;
  testID?: string;
}

const Header = ({ event, testID }: HeaderProps) => (
  <Box
    twClassName="flex-row items-center gap-3"
    testID={testID ?? `predict-next-event-header-${event.venueId}-${event.id}`}
  >
    {event.imageUrl ? (
      <Image
        source={event.imageUrl}
        testID={`predict-next-event-image-${event.id}`}
      />
    ) : null}
    <Title>{event.title}</Title>
  </Box>
);

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
  OutcomeRow,
  Title,
  Subtitle,
  Image,
  Header,
  Footer,
};
