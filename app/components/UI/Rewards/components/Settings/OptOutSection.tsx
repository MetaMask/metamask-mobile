import React, { memo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface OptOutSectionProps {
  onErasePress: () => void;
}

const OptOutSection: React.FC<OptOutSectionProps> = ({ onErasePress }) => (
  <>
    {/* Divider */}
    <Box twClassName="mt-4 border-b border-border-muted" />

    <Box testID="opt-out-section" twClassName="gap-4 flex-col p-4">
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.optout.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative"
          testID="opt-out-section-description"
        >
          {strings('rewards.optout.description')}
        </Text>
      </Box>

      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onErasePress}
        isDanger
        twClassName="w-full"
        testID="opt-out-erase-button"
      >
        {strings('rewards.optout.erase_button')}
      </Button>
    </Box>
  </>
);

export default memo(OptOutSection);
