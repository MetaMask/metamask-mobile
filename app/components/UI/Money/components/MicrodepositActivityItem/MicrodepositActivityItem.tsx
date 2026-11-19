import React, { useMemo } from 'react';
import type { MicrodepositActivity } from '../../types/moneyActivity';
import { microdepositDisplayInfo } from '../../utils/microdeposits';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface MicrodepositActivityItemProps {
  activity: MicrodepositActivity;
  privacyMode?: boolean;
}

/**
 * A bank microdeposit row. There is no detail view: the row exists to explain
 * a small credit on the user's bank statement, and the provider reports no
 * further state.
 */
const MicrodepositActivityItem = ({
  activity,
  privacyMode = false,
}: MicrodepositActivityItemProps) => {
  const display = useMemo(() => microdepositDisplayInfo(activity), [activity]);

  return (
    <ActivityRowView
      id={activity.id}
      display={display}
      privacyMode={privacyMode}
    />
  );
};

export default React.memo(MicrodepositActivityItem);
