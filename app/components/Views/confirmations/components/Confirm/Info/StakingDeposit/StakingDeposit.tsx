import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import FlatNavHeader from '../../FlatNavHeader';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';

const StakingDeposit = () => (
  <>
    <FlatNavHeader title={strings('stake.stake')} />
    <TokenHero />
    <StakingDetails />
    <AdvancedDetails />
  </>
);
export default StakingDeposit;
