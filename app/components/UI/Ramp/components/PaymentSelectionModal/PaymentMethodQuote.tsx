import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

interface PaymentMethodQuoteProps {
  cryptoAmount: string;
  fiatAmount: string;
}

const PaymentMethodQuote: React.FC<PaymentMethodQuoteProps> = ({
  cryptoAmount,
  fiatAmount,
}) => (
    <Box twClassName="items-end">
      <Text variant={TextVariant.BodyMDMedium}>{cryptoAmount}</Text>
      <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
        {fiatAmount}
      </Text>
    </Box>
  );

export default PaymentMethodQuote;
