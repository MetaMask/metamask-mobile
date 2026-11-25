/**
 * Component view tests for HomepageBalanceBreakdown's Perps row.
 * State-driven via Redux and Perps stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen, within } from '@testing-library/react-native';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  perpsTwoExchangeState,
  type PerpsTwoExchangeScenario,
} from '../../../../../../tests/component-view/presets/perpsTwoExchangePresets';
import { deepMerge } from '../../../../../../tests/component-view/stateFixture';
import HomepageBalanceBreakdown from './HomepageBalanceBreakdown';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

const ROUTE = 'HomepageBalanceBreakdownProbe';

// The homepage Perps slice reads the version-gated Perps flag, which the
// two-exchange preset leaves unset.
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

const renderPerpsRow = (scenario: PerpsTwoExchangeScenario) => {
  const { overrides, streamOverrides } = perpsTwoExchangeState(scenario);
  return renderPerpsView(HomepageBalanceBreakdown, ROUTE, {
    overrides: deepMerge(perpsEnabledOverrides, overrides),
    streamOverrides,
  });
};

describe('HomepageBalanceBreakdown Perps row', () => {
  it('shows the Perps subtotal without an allocation percentage while a venue has not reported', async () => {
    renderPerpsRow('lighterDown');

    const row = await screen.findByTestId(
      HomepageBalanceBreakdownTestIds.ROW('perps'),
    );

    expect(row).toHaveAccessibleName(/\$100\.00/);
    expect(
      within(row).getByTestId(HomepageBalanceBreakdownTestIds.VALUE('perps')),
    ).toHaveTextContent('$100.00');
    // A subtotal is displayable, but not a complete allocation percentage.
    expect(
      within(row).queryByTestId(
        HomepageBalanceBreakdownTestIds.PERCENTAGE('perps'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      within(row).queryByTestId(
        HomepageBalanceBreakdownTestIds.ERROR_WARNING('perps'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the combined total and the allocation percentage when every venue reported', async () => {
    renderPerpsRow('bothFunded');

    const row = await screen.findByTestId(
      HomepageBalanceBreakdownTestIds.ROW('perps'),
    );

    expect(row).toHaveAccessibleName(/\$150\.00/);
    expect(
      within(row).getByTestId(HomepageBalanceBreakdownTestIds.VALUE('perps')),
    ).toHaveTextContent('$150.00');
    expect(
      within(row).getByTestId(
        HomepageBalanceBreakdownTestIds.PERCENTAGE('perps'),
      ),
    ).toBeOnTheScreen();
  });
});
