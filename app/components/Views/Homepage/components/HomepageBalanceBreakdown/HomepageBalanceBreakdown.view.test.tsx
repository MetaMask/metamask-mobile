/**
 * Component view tests for HomepageBalanceBreakdown's Perps row.
 * State-driven via Redux and Perps stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen, within } from '@testing-library/react-native';
import type { AccountAggregateMetadata } from '@metamask/perps-controller';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import HomepageBalanceBreakdown from './HomepageBalanceBreakdown';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';

const ROUTE = 'HomepageBalanceBreakdownProbe';

// The homepage Perps slice reads the version-gated Perps flag, which the
// Perps preset leaves without a minimum version.
const perpsEnabledOverrides: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsPerpTradingEnabled: { enabled: true, minimumVersion: '0.0.0' },
        },
      },
    },
  },
};

// Aggregated account where Hyperliquid reported $1,500 and Lighter has not
// reported yet, so the total is a subtotal.
const twoVenueAccount = {
  availableBalance: '1500',
  totalBalance: '1500',
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
  providerStates: {
    hyperliquid: {
      providerId: 'hyperliquid',
      status: 'available',
      state: { totalBalance: '1500' },
    },
    lighter: { providerId: 'lighter', status: 'pending' },
  },
};

const partialAggregate: AccountAggregateMetadata = {
  status: 'partial',
  availableProviders: ['hyperliquid'],
  unavailableProviders: [],
  pendingProviders: ['lighter'],
};

describe('HomepageBalanceBreakdown Perps row', () => {
  it('shows the Perps subtotal while a venue has not reported', async () => {
    renderPerpsView(HomepageBalanceBreakdown, ROUTE, {
      overrides: perpsEnabledOverrides,
      streamOverrides: {
        account: twoVenueAccount,
        aggregate: partialAggregate,
      },
    });

    const row = await screen.findByTestId(
      HomepageBalanceBreakdownTestIds.ROW('perps'),
    );

    expect(
      within(row).getByTestId(HomepageBalanceBreakdownTestIds.VALUE('perps')),
    ).toHaveTextContent('$1,500.00');
    expect(
      within(row).queryByTestId(
        HomepageBalanceBreakdownTestIds.ERROR_WARNING('perps'),
      ),
    ).not.toBeOnTheScreen();
  });
});
