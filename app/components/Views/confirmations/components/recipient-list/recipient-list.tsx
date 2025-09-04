import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

import { useAccountAvatarType } from '../../hooks/useAccountAvatarType';
import { useSendContext } from '../../context/send-context/send-context';
import { Recipient, type RecipientType } from '../UI/recipient';
import { useSendScope } from '../../hooks/send/useSendScope';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { strings } from '../../../../../../locales/i18n';

interface RecipientListProps {
  data: RecipientType[];
  emptyMessage?: string;
  onRecipientSelected: (recipient: RecipientType) => void;
  isContactList?: boolean;
}

export function RecipientList({
  data,
  onRecipientSelected,
  emptyMessage,
  isContactList = false,
}: RecipientListProps) {
  const accountAvatarType = useAccountAvatarType();
  const { to } = useSendContext();
  const { isBIP44 } = useSendScope();

  if (data.length === 0 && emptyMessage) {
    return (
      <Box twClassName="flex-1 justify-center items-center p-4">
        <Text>{emptyMessage}</Text>
      </Box>
    );
  }

  if (isContactList || !isBIP44) {
    return (
      <Box twClassName="flex-1">
        <Text
          twClassName="m-4"
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {strings(isContactList ? 'send.contacts' : 'send.accounts')}
        </Text>
        <FlatRecipientList
          data={data}
          onRecipientSelected={onRecipientSelected}
          accountAvatarType={accountAvatarType}
          to={to}
          isBIP44={isBIP44}
        />
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1">
      <BIP44RecipientList
        data={data}
        onRecipientSelected={onRecipientSelected}
        accountAvatarType={accountAvatarType}
        to={to}
        isBIP44={isBIP44}
      />
    </Box>
  );
}

function FlatRecipientList({
  data,
  onRecipientSelected,
  accountAvatarType,
  to,
  isBIP44,
}: {
  data: RecipientType[];
  onRecipientSelected: (recipient: RecipientType) => void;
  accountAvatarType: AvatarAccountType;
  to?: string;
  isBIP44?: boolean;
}) {
  return (
    <Box twClassName="flex-1">
      {data.map((recipient) => (
        <Recipient
          key={recipient.address}
          recipient={recipient}
          accountAvatarType={accountAvatarType}
          isSelected={to === recipient.address}
          isBIP44={isBIP44}
          onPress={onRecipientSelected}
        />
      ))}
    </Box>
  );
}

function BIP44RecipientList({
  data,
  onRecipientSelected,
  accountAvatarType,
  to,
  isBIP44,
}: {
  data: RecipientType[];
  onRecipientSelected: (recipient: RecipientType) => void;
  accountAvatarType: AvatarAccountType;
  to?: string;
  isBIP44?: boolean;
}) {
  const groupedData = useMemo(
    () =>
      data.reduce((acc, recipient) => {
        const walletName = recipient.walletName || 'Unknown Wallet';
        if (!acc[walletName]) {
          acc[walletName] = [];
        }
        acc[walletName].push(recipient);
        return acc;
      }, {} as Record<string, RecipientType[]>),
    [data],
  );

  return (
    <Box twClassName="flex-1">
      {Object.keys(groupedData).map((walletName) => (
        <Box key={walletName} twClassName="flex-1">
          <Text
            twClassName="m-4"
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            {walletName}
          </Text>
          {groupedData[walletName].map((recipient) => (
            <Recipient
              key={recipient.address}
              recipient={recipient}
              accountAvatarType={accountAvatarType}
              isSelected={to === recipient.address}
              isBIP44={isBIP44}
              onPress={onRecipientSelected}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
