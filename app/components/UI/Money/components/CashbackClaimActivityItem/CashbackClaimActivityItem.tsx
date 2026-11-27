import React, { useMemo } from 'react';
import type { CardCashbackClaim } from '../../../../../core/Engine/controllers/card-controller/types';
import { cashbackClaimDisplayInfo } from '../../utils/cashbackClaim';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface CashbackClaimActivityItemProps {
  id: string;
  claim: CardCashbackClaim;
  privacyMode?: boolean;
}

const CashbackClaimActivityItem = ({
  id,
  claim,
  privacyMode,
}: CashbackClaimActivityItemProps) => {
  const display = useMemo(() => cashbackClaimDisplayInfo(claim), [claim]);

  return (
    <ActivityRowView id={id} display={display} privacyMode={privacyMode} />
  );
};

export default React.memo(CashbackClaimActivityItem);
