import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import PaymentMethodRow from '../payment-method-row';
import { PayWithSectionConfig } from '../../modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export interface PayWithSectionProps {
  config: PayWithSectionConfig;
}

const PayWithSection = ({ config }: PayWithSectionProps) => {
  const testID = config.testID ?? `pay-with-section-${config.id}`;

  return (
    <Box twClassName="py-2" testID={testID}>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        testID={`${testID}-title`}
        twClassName="px-4 pb-2 tracking-wider"
      >
        {config.title.toUpperCase()}
      </Text>
      <Box twClassName="bg-default" testID={`${testID}-rows`}>
        {config.rows.map((row) => (
          <PaymentMethodRow key={row.id} {...row} />
        ))}
      </Box>
    </Box>
  );
};

export default PayWithSection;
