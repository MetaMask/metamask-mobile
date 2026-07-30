import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import AccountGroupBalance from '../../../../UI/Assets/components/Balance/AccountGroupBalance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SLICE_ORDER } from '../../../BalanceBreakdown/constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useBalanceBreakdown } from '../../../BalanceBreakdown/hooks/useBalanceBreakdown';
import type { HomepageBalanceBreakdownLayout } from '../../abTestConfig';
import HomepageBalanceBreakdownAllocationBar from './HomepageBalanceBreakdownAllocationBar';
import HomepageBalanceBreakdownRow from './HomepageBalanceBreakdownRow';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { useHomepageBalanceBreakdownNavigation } from './useHomepageBalanceBreakdownNavigation';

export interface HomepageBalanceBreakdownProps {
  hideRows?: boolean;
  accountGroupBalanceProps?: React.ComponentProps<typeof AccountGroupBalance>;
  layout: HomepageBalanceBreakdownLayout;
  children?: React.ReactNode;
}

const HomepageBalanceBreakdown = ({
  hideRows = false,
  accountGroupBalanceProps,
  layout,
  children,
}: HomepageBalanceBreakdownProps) => {
  const { hero, slices } = useBalanceBreakdown();
  const { openSlice } = useHomepageBalanceBreakdownNavigation();

  return (
    <Box testID={HomepageBalanceBreakdownTestIds.CONTAINER}>
      <AccountGroupBalance {...accountGroupBalanceProps} heroOverride={hero} />
      {children ? <Box twClassName="mt-4 gap-4">{children}</Box> : null}
      {!hideRows ? (
        <Box
          testID={HomepageBalanceBreakdownTestIds.ROWS}
          twClassName="mt-3 px-4 pt-2"
        >
          {layout === 'allocation' ? (
            <HomepageBalanceBreakdownAllocationBar slices={slices} />
          ) : null}
          {SLICE_ORDER.map((key) => (
            <HomepageBalanceBreakdownRow
              key={key}
              layout={layout}
              onPress={() => openSlice(key)}
              slice={slices[key]}
              userCurrency={hero.userCurrency}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default HomepageBalanceBreakdown;
