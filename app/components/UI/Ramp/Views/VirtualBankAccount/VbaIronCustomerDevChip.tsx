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
  const [copied, setCopied] = useState(false);

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
    if (!customerId) {
      return;
    }
    Clipboard.setString(customerId);
    setCopied(true);
  }, [customerId]);

  if (!__DEV__ || !customerId) {
    return null;
  }

  return (
    <Box twClassName="absolute inset-0 z-50" pointerEvents="box-none">
      <Box twClassName="absolute top-14 right-3">
        <Pressable
          onPress={handleCopy}
          hitSlop={12}
          testID={VbaIronCustomerDevChipSelectorsIDs.CHIP}
        >
          <Box twClassName="rounded-full bg-muted px-3 py-1">
            <Text variant={TextVariant.BodySm} selectable>
              {copied ? 'Copied' : customerId}
            </Text>
          </Box>
        </Pressable>
      </Box>
    </Box>
  );
};

export default VbaIronCustomerDevChip;
