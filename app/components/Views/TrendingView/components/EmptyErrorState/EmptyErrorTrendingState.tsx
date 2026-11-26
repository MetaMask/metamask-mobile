import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface EmptyErrorTrendingStateProps {
  onRetry?: () => void;
}

const EmptyErrorTrendingState: React.FC<EmptyErrorTrendingStateProps> = ({
  onRetry,
}) => (
  <Box
    testID="empty-error-trending-state"
    className="flex-col pt-9 pb-24 justify-center items-center gap-3 flex-1"
  >
    <Box className="flex-col w-[337px] items-stretch">
      <Text
        variant={TextVariant.HeadingSm}
        className="text-default text-center self-stretch mb-2"
      >
        {strings('trending.empty_error_trending_state.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        className="text-alternative text-center self-stretch font-medium"
      >
        {strings('trending.empty_error_trending_state.description')}
      </Text>
      {onRetry && (
        <Button
          variant={ButtonVariant.Primary}
          className="self-stretch mt-6"
          onPress={onRetry}
          testID="empty-error-trending-state--retry-button"
        >
          {strings('trending.empty_error_trending_state.try_again')}
        </Button>
      )}
    </Box>
  </Box>
);

export default EmptyErrorTrendingState;
