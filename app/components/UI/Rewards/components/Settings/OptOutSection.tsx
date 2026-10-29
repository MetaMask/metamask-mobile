import React, { memo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface OptOutSectionProps {
  onErasePress: () => void;
}

const OptOutSection: React.FC<OptOutSectionProps> = ({ onErasePress }) => (
  <>
    <SectionDivider marginVertical={8} />

    <Box testID="opt-out-section" twClassName="flex-col px-4">
      <Box twClassName="gap-2 pb-2">
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

      <Box twClassName="pt-3">
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
    </Box>
  </>
);

export default memo(OptOutSection);
