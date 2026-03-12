import React from 'react';
import { TextColor , Box } from '@metamask/design-system-react-native';
import Accordion from '../../../../../../component-library/components/Accordions/Accordion/Accordion';
import { AccordionHeaderHorizontalAlignment } from '../../../../../../component-library/components/Accordions/Accordion';
import { DiffHighlightedAddress } from '../diff-highlighted-address/diff-highlighted-address';
import { strings } from '../../../../../../../locales/i18n';

interface AddressPoisoningAlertContentProps {
  address: string;
  knownAddress: string;
  diffIndices: number[];
}

export const AddressPoisoningAlertContent = ({
  address,
  knownAddress,
  diffIndices,
}: AddressPoisoningAlertContentProps) => (
  <Accordion
    title={strings('send.compare_addresses')}
    isExpanded={false}
    horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
  >
    <Box twClassName="mt-2 gap-2">
      <DiffHighlightedAddress
        address={address}
        diffIndices={diffIndices}
        label={strings('send.entered_malicious')}
        dotTwColor="bg-error-default"
      />
      <DiffHighlightedAddress
        address={knownAddress}
        diffIndices={diffIndices}
        label={strings('send.known_safe')}
        dotTwColor="bg-success-default"
        highlightTwColor="bg-success-muted"
        diffTextColor={TextColor.SuccessDefault}
      />
    </Box>
  </Accordion>
);
