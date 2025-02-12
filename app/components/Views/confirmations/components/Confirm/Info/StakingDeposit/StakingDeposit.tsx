import React from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import FlatNavHeader from '../../FlatNavHeader';
import TokenHero from '../../TokenHero';

const StakingDeposit = () => (
  <>
    <FlatNavHeader title={strings('stake.stake')} />
    <TokenHero />
  </>
);
export default StakingDeposit;
