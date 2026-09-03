import React from 'react';
import { Pressable } from 'react-native';
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
import { PredictEventCard } from '../../../events/cards';
import type { FeedScreenId } from '../../../navigation/feedScreens';
import type { PredictEvent } from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface FeedPreviewSectionProps {
  feedScreenId: FeedScreenId;
  title: string;
  events: readonly PredictEvent[];
  isLoading: boolean;
  isError: boolean;
  onOpen: () => void;
  onOpenEvent: (event: PredictEvent) => void;
  onRetry: () => void;
}

export const FeedPreviewSection = ({
  feedScreenId,
  title,
  events,
  isLoading,
  isError,
  onOpen,
  onOpenEvent,
  onRetry,
}: FeedPreviewSectionProps) => {
  const renderEvent = (event: PredictEvent) => {
    const handlePress = () => onOpenEvent(event);
    return (
      <PredictEventCard
        key={event.id}
        event={event}
        variant="featured"
        onPress={handlePress}
      />
    );
  };

  return (
    <Box testID={PredictHomeTestIds.section(feedScreenId)} twClassName="gap-3">
      <Pressable
        testID={PredictHomeTestIds.sectionHeader(feedScreenId)}
        accessibilityRole="button"
        accessibilityLabel={`View ${title}`}
        onPress={onOpen}
      >
        <Box twClassName="flex-row items-center gap-1">
          <Text variant={TextVariant.HeadingMd}>{title}</Text>
          <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
        </Box>
      </Pressable>

      {isLoading ? (
        <Box
          testID={PredictHomeTestIds.sectionLoading(feedScreenId)}
          twClassName="gap-3"
        >
          <Box twClassName="h-32 rounded-xl bg-muted" />
          <Box twClassName="h-32 rounded-xl bg-muted" />
        </Box>
      ) : isError && events.length === 0 ? (
        <Box
          testID={PredictHomeTestIds.sectionError(feedScreenId)}
          twClassName="items-start gap-2 py-4"
        >
          <Text>Games couldn’t be loaded.</Text>
          <Button
            testID={PredictHomeTestIds.sectionRetry(feedScreenId)}
            variant={ButtonVariant.Tertiary}
            onPress={onRetry}
          >
            Retry
          </Button>
        </Box>
      ) : events.length === 0 ? (
        <Box
          testID={PredictHomeTestIds.sectionEmpty(feedScreenId)}
          twClassName="py-4"
        >
          <Text>No games available.</Text>
        </Box>
      ) : (
        <Box twClassName="gap-3">{events.map(renderEvent)}</Box>
      )}
    </Box>
  );
};
