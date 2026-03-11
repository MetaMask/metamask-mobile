import React, { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useAddressPoisoningDetection } from '../send/useAddressPoisoningDetection';
import { strings } from '../../../../../../locales/i18n';
import { DiffHighlightedAddress } from '../../components/send/diff-highlighted-address/diff-highlighted-address';
import { Box, TextColor } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Accordion from '../../../../../component-library/components/Accordions/Accordion/Accordion';
import { AccordionHeaderHorizontalAlignment } from '../../../../../component-library/components/Accordions/Accordion';

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
            <Accordion
              title={strings('send.compare_addresses')}
              isExpanded={false}
              horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
            >
              <Box twClassName="mt-2 gap-2">
                <DiffHighlightedAddress
                  address={toAddress}
                  diffIndices={bestMatch.diffIndices}
                  label={strings('send.entered_malicious')}
                  dotTwColor="bg-error-default"
                />
                <DiffHighlightedAddress
                  address={bestMatch.knownAddress}
                  diffIndices={bestMatch.diffIndices}
                  label={strings('send.known_safe')}
                  dotTwColor="bg-success-default"
                  highlightTwColor="bg-success-muted"
                  diffTextColor={TextColor.SuccessDefault}
                />
              </Box>
            </Accordion>
          </Box>
        ),
        isBlocking: false,
      },
    ];
  }, [isPoisoningSuspect, bestMatch, toAddress]);
}
