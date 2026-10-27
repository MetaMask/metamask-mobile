import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import type { PredictVenueCapabilities } from '../../../capabilities';
import { strings } from '../../../../../../../locales/i18n';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface HomeSectionsStatusProps {
  capabilities: PredictVenueCapabilities;
  /** Whether any Home section's Feed key is supported. */
  hasSections: boolean;
}

/**
 * What Home shows in place of its Feed sections while the Venue's
 * capabilities are unresolved, failed, or support none of them. Renders
 * nothing once at least one section is supported.
 */
export const HomeSectionsStatus = ({
  capabilities,
  hasSections,
}: HomeSectionsStatusProps) => {
  if (capabilities.status === 'loading') {
    return (
      <Box testID={PredictHomeTestIds.SECTIONS_LOADING} twClassName="gap-3">
        <Box twClassName="h-6 w-24 rounded bg-muted" />
        <Box twClassName="h-32 rounded-xl bg-muted" />
        <Box twClassName="h-32 rounded-xl bg-muted" />
      </Box>
    );
  }
  if (
    capabilities.status === 'unavailable' &&
    capabilities.reason === 'error'
  ) {
    return (
      <Box
        testID={PredictHomeTestIds.SECTIONS_ERROR}
        twClassName="items-start gap-2 py-4"
      >
        <Text>{strings('predict_next.home_sections.error')}</Text>
        <Button
          testID={PredictHomeTestIds.SECTIONS_RETRY}
          variant={ButtonVariant.Tertiary}
          onPress={capabilities.retry}
        >
          {strings('predict_next.home_sections.retry')}
        </Button>
      </Box>
    );
  }
  if (hasSections) {
    return null;
  }
  return (
    <Box testID={PredictHomeTestIds.SECTIONS_UNAVAILABLE} twClassName="py-4">
      <Text>{strings('predict_next.home_sections.unavailable')}</Text>
    </Box>
  );
};
