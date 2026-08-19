import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictBuyErrorProps {
  errorMessage?: string;
}

const PredictBuyError = ({ errorMessage }: PredictBuyErrorProps) => {
  const tw = useTailwind();

  if (!errorMessage) return null;

  return (
    <Box twClassName="px-12 pb-4">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.ErrorDefault}
        style={tw.style('text-center')}
      >
        {errorMessage}
      </Text>
    </Box>
  );
};

export default PredictBuyError;
