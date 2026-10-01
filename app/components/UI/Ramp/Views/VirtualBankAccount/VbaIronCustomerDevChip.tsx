import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Engine from '../../../../../core/Engine';

export const VbaIronCustomerDevChipSelectorsIDs = {
  CHIP: 'vba-iron-customer-dev-chip',
} as const;

/**
 * Dev-only label for the MoonPay Iron customer id. The sandbox Customers
 * table shows this id in the Name column as "Customer {id}".
 */
const VbaIronCustomerDevChip = () => {
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__) {
      return undefined;
    }

    let cancelled = false;

    const loadCustomerId = async () => {
      try {
        const id =
          await Engine.context.RampsController.resolveAutorampCustomerId();
        if (!cancelled) {
          setCustomerId(id);
        }
      } catch {
        if (!cancelled) {
          setCustomerId(null);
        }
      }
    };

    loadCustomerId();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (customerId) {
      Clipboard.setString(customerId);
    }
  }, [customerId]);

  if (!__DEV__ || !customerId) {
    return null;
  }

  return (
    <Box twClassName="absolute top-14 right-3 z-50">
      <Pressable
        onPress={handleCopy}
        testID={VbaIronCustomerDevChipSelectorsIDs.CHIP}
      >
        <Box twClassName="rounded-full bg-muted px-3 py-1">
          <Text variant={TextVariant.BodySm}>{`Iron ${customerId}`}</Text>
        </Box>
      </Pressable>
    </Box>
  );
};

export default VbaIronCustomerDevChip;
