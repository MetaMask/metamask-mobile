import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

/** Shared loading, error, and empty states. */
export function ExploreState({
  loading,
  error,
  onRetry,
  empty = 'no_results',
}: {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: string;
}) {
  if (loading)
    return (
      <Box padding={4} gap={3}>
        <Skeleton width="100%" height={96} />
        <Skeleton width="100%" height={96} />
      </Box>
    );
  return (
    <Box padding={6} gap={3}>
      <Text color={TextColor.TextAlternative} twClassName="text-center">
        {strings(`collectibles_discovery.${error ? 'load_error' : empty}`)}
      </Text>
      {error && onRetry && (
        <Button variant={ButtonVariant.Secondary} onPress={onRetry}>
          {strings('collectibles_discovery.retry')}
        </Button>
      )}
    </Box>
  );
}
