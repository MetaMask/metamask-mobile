import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import AdvancedDetails from '../../AdvancedDetails/AdvancedDetails';
import FlatNavHeader from '../../FlatNavHeader';
import StakingDetails from '../../StakingDetails';
import TokenHero from '../../TokenHero';
import GasFeesDetails from '../GasFeesDetails';

const StakingDeposit = () => (
  <>
    <TokenHero />
    <StakingDetails />
    <GasFeesDetails />
    <AdvancedDetails />
  </>
);
export default StakingDeposit;
