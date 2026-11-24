import React from 'react';
import { Box, Tag, TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

interface NoFeeTagProps {
  testID?: string;
}

export function NoFeeTag({ testID = 'no-fee-tag' }: NoFeeTagProps = {}) {
  return (
    <Box twClassName="shrink-0">
      <Tag severity={TagSeverity.Info} testID={testID}>
        {strings('money.potential_earnings.no_fee')}
      </Tag>
    </Box>
  );
}

export function NoDepositFeeTag({
  testID = 'no-deposit-fee-tag',
}: NoFeeTagProps = {}) {
  return (
    <Box twClassName="shrink-0">
      <Tag severity={TagSeverity.Info} testID={testID}>
        {strings('confirm.pay_with_bottom_sheet.no_deposit_fee')}
      </Tag>
    </Box>
  );
}
