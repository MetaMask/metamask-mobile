import React from 'react';
import {
  KeyValueRow,
  KeyValueRowVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd, getClaimEarningsBreakdownRows } from './rewardsUiFixtures';

interface ClaimEarningsBreakdownProps {
  testIDPrefix: string;
}

/** Claim buckets shown under total earnings. Shared by the paused and info sheets. */
const ClaimEarningsBreakdown: React.FC<ClaimEarningsBreakdownProps> = ({
  testIDPrefix,
}) => (
  <>
    {getClaimEarningsBreakdownRows().map((row) => (
      <KeyValueRow
        key={row.id}
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings(`rewards.kol.${row.labelKey}`)}
        value={formatUsd(row.amount)}
        testID={`${testIDPrefix}-${row.id}`}
      />
    ))}
  </>
);

export default ClaimEarningsBreakdown;
