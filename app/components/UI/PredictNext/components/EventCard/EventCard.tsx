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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice } from './formatAskPrice';

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

export const EventCard = { Root, Pressable, Outcome, Title, Subtitle };
