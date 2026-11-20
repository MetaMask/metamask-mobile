import React from 'react';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../../../util/theme';
import { strings } from '../../../../../../../../locales/i18n';
import type { VaultCompositionComponent } from '../../../../types/moneyVaultComposition';
import { getVaultCompositionComponentColor } from '../MoneyVaultCompositionChart/MoneyVaultCompositionChart.utils';
import MoneyVaultCompositionMarketRow from './MoneyVaultCompositionMarketRow';
import { MoneyVaultCompositionMarketRowTestIds } from './MoneyVaultCompositionMarketRow.testIds';

const createComponent = (
  overrides: Partial<VaultCompositionComponent> = {},
): VaultCompositionComponent => ({
  component_key: 'aave_v3_musd',
  label: 'Aave mUSD',
  protocol: 'aave_v3',
  assets: [{ asset_symbol: 'mUSD', amount: '1', value_usd: '1' }],
  allocation_value_usd: '0.38',
  allocation_fraction: '0.38',
  organic_supply_apy: '0.1234',
  incentive_apr: null,
  estimated_total_annual_rate: null,
  weighted_organic_apy_contribution: '0',
  weighted_incentive_apr_contribution: null,
  campaign_ends_at: null,
  source_links: [],
  ...overrides,
});

describe('MoneyVaultCompositionMarketRow', () => {
  it('renders asset, protocol, allocation, and rate values', () => {
    const component = createComponent();

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.PRIMARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('mUSD');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('Aave v3 · Monad');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.ALLOCATION(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('38%');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SUPPLY_APY(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('12.34%');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.INCENTIVE_APR(
          component.component_key,
        ),
      ),
    ).toHaveTextContent(strings('money.earnings.unavailable'));
  });

  it('formats non-null incentive APR without checking protocol', () => {
    const component = createComponent({
      component_key: 'morpho_v2_musd',
      protocol: 'morpho_v2',
      incentive_apr: '0.0155',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.INCENTIVE_APR(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('1.55%');
  });

  it('renders a dash for a zero incentive APR', () => {
    const component = createComponent({ incentive_apr: '0' });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.INCENTIVE_APR(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('—');
  });

  it('renders unavailable for a non-Aave component with a null incentive APR', () => {
    const component = createComponent({
      component_key: 'morpho_v2_musd',
      protocol: 'morpho_v2',
      incentive_apr: null,
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.INCENTIVE_APR(
          component.component_key,
        ),
      ),
    ).toHaveTextContent(strings('money.earnings.unavailable'));
  });

  it('renders cash reserve without a network suffix', () => {
    const component = createComponent({
      component_key: 'direct_idle_musd',
      protocol: 'liquidity_buffer',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('Cash reserve');
  });

  it('renders a dash for a zero Supply APY', () => {
    const component = createComponent({
      component_key: 'direct_idle_musd',
      protocol: 'liquidity_buffer',
      organic_supply_apy: '0',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SUPPLY_APY(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('—');
  });

  it('uses the shared chart color and hides decorative elements from accessibility', () => {
    const component = createComponent();

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );
    const row = getByTestId(
      MoneyVaultCompositionMarketRowTestIds.ROW(component.component_key),
    );
    const dot = getByTestId(
      MoneyVaultCompositionMarketRowTestIds.DOT(component.component_key),
    );

    expect(row.props.accessible).toBe(false);
    expect(dot.props.accessible).toBe(false);
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(
      getVaultCompositionComponentColor(
        component.component_key,
        mockTheme.colors,
      ),
    );
  });
});
