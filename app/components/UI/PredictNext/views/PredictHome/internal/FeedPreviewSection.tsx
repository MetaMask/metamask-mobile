import React from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PredictEventCard } from '../../../events/cards';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface FeedPreviewSectionProps {
  /** The catalog's section ID; the section's test IDs use it. */
  sectionId: string;
  title: string;
  /** How many cards the section shows; it loads with one skeleton each. */
  limit: number;
  events: readonly PredictEvent[];
  isLoading: boolean;
  isError: boolean;
  /** Opens the section's Feed Screen. Without it the header is plain text
   * with no chevron. */
  onOpen?: () => void;
  onOpenEvent: (event: PredictEvent) => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
  onRetry: () => void;
  /** Reports the section's frame within the scroll content. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * A Home section previewing one Feed's first Events as featured cards, under a
 * header that opens the section's Feed Screen when there is one.
 */
export const FeedPreviewSection = ({
  sectionId,
  title,
  limit,
  events,
  isLoading,
  isError,
  onOpen,
  onOpenEvent,
  onOrder,
  onRetry,
  onLayout,
}: FeedPreviewSectionProps) => {
  const renderEvent = (event: PredictEvent) => {
    const handlePress = () => onOpenEvent(event);
    return (
      <PredictEventCard
        key={event.id}
        event={event}
        variant="featured"
        onPress={handlePress}
        onOrder={onOrder}
      />
    );
  };

  return (
    <Box
      testID={PredictHomeTestIds.section(sectionId)}
      twClassName="gap-3"
      onLayout={onLayout}
    >
      {onOpen ? (
        <Pressable
          testID={PredictHomeTestIds.sectionHeader(sectionId)}
          accessibilityRole="button"
          accessibilityLabel={strings('predict_next.home_feed.open_section', {
            title,
          })}
          onPress={onOpen}
        >
          <Box twClassName="flex-row items-center gap-1">
            <Text variant={TextVariant.HeadingMd}>{title}</Text>
            <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
          </Box>
        </Pressable>
      ) : (
        <Text
          testID={PredictHomeTestIds.sectionHeader(sectionId)}
          accessibilityRole="header"
          variant={TextVariant.HeadingMd}
        >
          {title}
        </Text>
      )}

      {isLoading ? (
        <Box
          testID={PredictHomeTestIds.sectionLoading(sectionId)}
          twClassName="gap-3"
        >
          {Array.from({ length: limit }, (_, index) => (
            <Box
              key={index}
              testID={PredictHomeTestIds.sectionSkeleton(sectionId)}
              twClassName="h-32 rounded-xl bg-muted"
            />
          ))}
        </Box>
      ) : isError && events.length === 0 ? (
        <Box
          testID={PredictHomeTestIds.sectionError(sectionId)}
          twClassName="items-start gap-2 py-4"
        >
          <Text>{strings('predict_next.home_feed.preview_error')}</Text>
          <Button
            testID={PredictHomeTestIds.sectionRetry(sectionId)}
            variant={ButtonVariant.Tertiary}
            onPress={onRetry}
          >
            {strings('predict_next.home_feed.retry')}
          </Button>
        </Box>
      ) : events.length === 0 ? (
        <Box
          testID={PredictHomeTestIds.sectionEmpty(sectionId)}
          twClassName="py-4"
        >
          <Text>{strings('predict_next.home_feed.preview_empty')}</Text>
        </Box>
      ) : (
        <Box twClassName="gap-3">{events.map(renderEvent)}</Box>
      )}
    </Box>
  );
};
