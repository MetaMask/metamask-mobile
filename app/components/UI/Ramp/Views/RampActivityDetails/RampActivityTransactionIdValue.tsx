import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
} from '@metamask/design-system-react-native';
import { renderShortAddress } from '../../../../../util/address';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { strings } from '../../../../../../locales/i18n';

export function RampActivityTransactionIdValue({ hash }: { hash?: string }) {
  if (!hash) {
    return <Text>{strings('transactions.tx_details_not_available')}</Text>;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      <Text>{renderShortAddress(hash, 4)}</Text>
      <Pressable
        onPress={() => ClipboardManager.setString(hash)}
        testID="ramp-transaction-id-copy"
      >
        <Icon
          name={IconName.Copy}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Pressable>
    </Box>
  );
}
