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
    className="flex-1 flex-col items-center justify-center gap-3 pb-24 pt-9"
  >
    <Box className="w-[337px] flex-col items-stretch">
      <Text
        variant={TextVariant.HeadingSm}
        className="mb-2 self-stretch text-center text-default"
      >
        {strings('trending.empty_error_trending_state.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        className="self-stretch text-center font-medium text-alternative"
      >
        {strings('trending.empty_error_trending_state.description')}
      </Text>
      {onRetry && (
        <Button
          variant={ButtonVariant.Primary}
          className="mt-6 self-stretch"
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
