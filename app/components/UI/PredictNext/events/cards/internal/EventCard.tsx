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
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
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
  twClassName?: string;
}

const Root = ({ children, testID, twClassName }: RootProps) => (
  <Box
    twClassName={twClassName ?? 'gap-3 rounded-2xl bg-section p-4 pt-3'}
    testID={testID}
  >
    {children}
  </Box>
);

const Pressable = ({ children, ...props }: PressableProps) => (
  <NativePressable {...props}>{children}</NativePressable>
);

const Header = ({
  children,
  twClassName = 'flex-row items-center gap-3',
}: {
  children: React.ReactNode;
  twClassName?: string;
}) => <Box twClassName={twClassName}>{children}</Box>;

const Title = ({
  children,
  numberOfLines = 2,
  twClassName = 'flex-1',
}: {
  children: React.ReactNode;
  numberOfLines?: number;
  twClassName?: string;
}) => (
  <Text
    variant={TextVariant.HeadingSm}
    numberOfLines={numberOfLines}
    twClassName={twClassName}
  >
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

const Body = ({
  children,
  twClassName,
}: {
  children: React.ReactNode;
  twClassName?: string;
}) => <Box twClassName={twClassName}>{children}</Box>;

const Actions = ({ children }: { children: React.ReactNode }) => (
  <Box twClassName="flex-row gap-2 pt-2">{children}</Box>
);

const Action = ({ children }: { children: React.ReactNode }) => (
  <Box twClassName="min-w-0 flex-1">{children}</Box>
);

const Footer = ({ children, testID }: RootProps) => (
  <Box twClassName="flex-row items-center justify-between" testID={testID}>
    {children}
  </Box>
);

const FooterLeading = ({ children }: { children: React.ReactNode }) => (
  <Box twClassName="flex-1 flex-row items-center gap-3">{children}</Box>
);

const MetadataTag = ({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) => (
  <Tag severity={TagSeverity.Neutral} testID={testID}>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {children}
    </Text>
  </Tag>
);

const Volume = ({ value, testID }: { value?: string; testID?: string }) => {
  const volume = formatVolume(value);

  return volume === undefined ? null : (
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      testID={testID}
    >
      ${volume} Vol
    </Text>
  );
};

const MoreMarkets = ({
  count,
  onPress,
  testID,
}: {
  count: number;
  onPress?: () => void;
  testID?: string;
}) =>
  count > 0 ? (
    <NativePressable
      accessibilityLabel={`+${count} more`}
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
    >
      <Box twClassName="flex-row items-center">
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          +{count} more
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Xs}
          color={IconColor.IconAlternative}
        />
      </Box>
    </NativePressable>
  ) : null;

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

export const EventCard = {
  Root,
  Pressable,
  Header,
  Title,
  Image,
  Body,
  Actions,
  Action,
  Footer,
  FooterLeading,
  MetadataTag,
  Volume,
  MoreMarkets,
  OutcomeRow,
};
