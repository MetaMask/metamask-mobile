import React, { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useAddressPoisoningDetection } from '../send/useAddressPoisoningDetection';
import { strings } from '../../../../../../locales/i18n';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { AddressPoisoningAlertContent } from '../../components/send/address-poisoning-alert-content/address-poisoning-alert-content';

export function useAddressPoisoningAlert(): Alert[] {
  const toAddress = useTransferRecipient();
  const { isPoisoningSuspect, bestMatch } =
    useAddressPoisoningDetection(toAddress);

  return useMemo(() => {
    if (!isPoisoningSuspect || !bestMatch || !toAddress) {
      return [];
    }

    return [
      {
        key: AlertKeys.AddressPoisoning,
        severity: Severity.Danger,
        title: strings('alert_system.address_poisoning.title'),
        content: (
          <Box>
            <Text variant={TextVariant.BodyMD}>
              {strings('alert_system.address_poisoning.message')}
            </Text>
            <AddressPoisoningAlertContent
              address={toAddress}
              knownAddress={bestMatch.knownAddress}
              diffIndices={bestMatch.diffIndices}
            />
          </Box>
        ),
        isBlocking: false,
      },
    ];
  }, [isPoisoningSuspect, bestMatch, toAddress]);
}
