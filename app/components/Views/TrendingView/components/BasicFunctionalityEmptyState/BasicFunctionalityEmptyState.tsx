import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface BasicFunctionalityEmptyStateProps {
  onEnablePress: () => void;
}

const BasicFunctionalityEmptyState: React.FC<
  BasicFunctionalityEmptyStateProps
> = ({ onEnablePress }) => (
  <Box twClassName="flex-col w-[393px] pt-9 pb-24 justify-center items-center gap-3 flex-1">
    <Box twClassName="flex-col w-[337px] items-stretch">
      <Text
        variant={TextVariant.HeadingSm}
        twClassName="text-default text-center self-stretch mb-2"
      >
        {strings('trending.basic_functionality_disabled_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative text-center self-stretch font-medium"
      >
        {strings('trending.basic_functionality_disabled_description')}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        twClassName="h-[48px] self-stretch mt-6"
        onPress={onEnablePress}
      >
        {strings('trending.enable_basic_functionality')}
      </Button>
    </Box>
  </Box>
);

export default BasicFunctionalityEmptyState;
