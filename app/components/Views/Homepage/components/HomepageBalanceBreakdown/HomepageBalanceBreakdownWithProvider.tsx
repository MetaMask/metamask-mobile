import React from 'react';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import HomepageBalanceBreakdown, {
  type HomepageBalanceBreakdownProps,
} from './HomepageBalanceBreakdown';

/**
 * The aggregate includes live Perps account data, whose hooks require both
 * Perps providers even though PerpsAlwaysOnProvider owns connection lifecycle.
 */
const HomepageBalanceBreakdownWithProvider = (
  props: HomepageBalanceBreakdownProps,
) => (
  <PerpsConnectionProvider suppressErrorView>
    <PerpsStreamProvider>
      <HomepageBalanceBreakdown {...props} />
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

export default HomepageBalanceBreakdownWithProvider;
