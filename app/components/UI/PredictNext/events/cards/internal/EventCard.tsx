import React from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
} from 'react-native';
import {
  AvatarBase,
  AvatarBaseSize,
  Box,
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
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import {
  formatAskPrice,
  formatVolume,
  getAskPricePercent,
} from '../../shared/formatting';
import { isOutcomeTradeable } from '../../shared/tradeable';
import { OutcomeRow as SharedOutcomeRow } from '../../shared/ui';

export const EVENT_CARD_VISIBLE_MARKET_COUNT = 3;

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

const Subtitle = ({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    numberOfLines={1}
    testID={testID}
  >
    {children}
  </Text>
);

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
  label?: string;
  /** Avatar image; a token-coloured placeholder when absent. */
  imageUrl?: string;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  testID?: string;
}

/**
 * One Outcome on a feed card: an avatar, the label over a neutral quote bar,
 * and a muted price pill that opens an Order.
 */
const OutcomeRow = ({
  event,
  market,
  outcome,
  label = outcome.label,
  imageUrl,
  onOrder,
  testID,
}: OutcomeRowProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const price = formatAskPrice(outcome.askPrice);

  return (
    <SharedOutcomeRow.Root>
      <Box twClassName="min-w-0 flex-1 flex-row items-center gap-2">
        <AvatarBase
          size={AvatarBaseSize.Lg}
          testID={testID ? `${testID}-avatar` : undefined}
        >
          {imageUrl ? (
            <ExpoImage
              source={imageUrl}
              style={tw.style('h-full w-full')}
              contentFit="cover"
              recyclingKey={imageUrl}
              testID={testID ? `${testID}-avatar-image` : undefined}
            />
          ) : null}
        </AvatarBase>
        <SharedOutcomeRow.Label
          label={label}
          percent={getAskPricePercent(outcome.askPrice)}
          color={colors.icon.alternative}
          lineTestID={testID ? `${testID}-bar` : undefined}
        />
      </Box>
      <SharedOutcomeRow.Price
        price={price}
        color={colors.text.default}
        isDisabled={!onOrder || !isOutcomeTradeable(market, outcome)}
        onPress={() => onOrder?.(event, market, outcome)}
        accessibilityLabel={strings(
          'predict_next.event.standard_outcome_accessibility_label',
          {
            title: event.title,
            outcome: label,
            price: price ?? strings('predict.market_groups.price_unavailable'),
          },
        )}
        testID={testID}
      />
    </SharedOutcomeRow.Root>
  );
};

export const EventCard = {
  Root,
  Pressable,
  Header,
  Title,
  Subtitle,
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
