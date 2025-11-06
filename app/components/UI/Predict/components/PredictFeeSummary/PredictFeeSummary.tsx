import React from 'react';
import {
  Box,
  ButtonIcon,
  IconName,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { formatPrice } from '../../utils/format';

interface PredictFeeSummaryProps {
  disabled: boolean;
  providerFee: number;
  metamaskFee: number;
  total: number;
}

const PredictFeeSummary: React.FC<PredictFeeSummaryProps> = ({
  disabled,
  metamaskFee,
  providerFee,
  total,
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Box twClassName="p-4 flex-col gap-2">
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName=" flex-row gap-2 items-center">
          <Text color={TextColor.Alternative}>Provider fee</Text>
          <ButtonIcon iconName={IconName.Info} twClassName="text-alternative" />
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(providerFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative}>MetaMask fee</Text>
          <ButtonIcon iconName={IconName.Info} />
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(metamaskFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative}>Total</Text>
          <ButtonIcon iconName={IconName.Info} />
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(total, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
    </Box>
  );
};

export default PredictFeeSummary;
