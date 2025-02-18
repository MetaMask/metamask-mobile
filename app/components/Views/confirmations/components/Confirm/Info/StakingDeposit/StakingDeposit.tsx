import React from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import FlatNavHeader from '../../FlatNavHeader';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';

const StakingDeposit = () => (
  <>
    <FlatNavHeader title={strings('stake.stake')} />
    <TokenHero />
    <StakingDetails />
  </>
);
export default StakingDeposit;
