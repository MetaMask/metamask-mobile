import { Text } from '@metamask/design-system-react-native';
import React from 'react';
import { useFeedAgeNow } from '../hooks/useFeedAgeNow';
import { formatFeedPostAge } from '../utils/formatters';

type FeedPostAgeProps = Omit<React.ComponentProps<typeof Text>, 'children'> & {
  timestampMs: number;
  now?: number;
};

/** A relative age ("3 min ago") that refreshes itself on the age clock. */
const FeedPostAge: React.FC<FeedPostAgeProps> = ({
  timestampMs,
  now,
  ...textProps
}) => {
  const clock = useFeedAgeNow(now);
  return <Text {...textProps}>{formatFeedPostAge(timestampMs, clock)}</Text>;
};

export default FeedPostAge;
