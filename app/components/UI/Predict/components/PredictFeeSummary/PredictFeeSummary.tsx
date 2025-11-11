import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
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
    <Box twClassName="pt-4 px-4 pb-6 flex-col gap-4">
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName=" flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.provider_fee')}
          </Text>
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(providerFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.metamask_fee')}
          </Text>
        </Box>
        <Text color={TextColor.Alternative}>
          {formatPrice(metamaskFee, {
            maximumDecimals: 2,
          })}
        </Text>
      </Box>
      <Box twClassName="flex-row justify-between items-center">
        <Box twClassName="flex-row gap-2 items-center">
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings('predict.fee_summary.total')}
          </Text>
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
