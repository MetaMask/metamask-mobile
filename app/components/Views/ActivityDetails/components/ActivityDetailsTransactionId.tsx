import React from 'react';
import {
  Box,
  ButtonIconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { renderShortAddress } from '../../../../util/address';
// eslint-disable-next-line import-x/no-restricted-paths -- reuse the shared copy button (ClipboardManager + icon feedback)
import CopyButton from '../../confirmations/components/UI/copy-button/copy-button';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

export function ActivityDetailsTransactionId({ hash }: { hash?: string }) {
  if (!hash) {
    return null;
  }

  return (
    <Box twClassName="flex-row items-center gap-1 rounded-lg bg-muted py-1 pl-3 pr-1">
      <Text variant={TextVariant.BodyMd}>{renderShortAddress(hash)}</Text>
      <CopyButton
        copyText={hash}
        size={ButtonIconSize.Sm}
        iconColor={IconColor.IconAlternative}
        testID={ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY}
      />
    </Box>
  );
}
