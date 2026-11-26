import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import type { VaultCompositionComponent } from '../../../../types/moneyVaultComposition';
import MoneyVaultCompositionMarketsTable from './MoneyVaultCompositionMarketsTable';
import { MoneyVaultCompositionMarketsTableTestIds } from './MoneyVaultCompositionMarketsTable.testIds';
import { MoneyVaultCompositionMarketRowTestIds } from '../MoneyVaultCompositionMarketRow/MoneyVaultCompositionMarketRow.testIds';

const createComponent = (
  componentKey: VaultCompositionComponent['component_key'],
  allocationFraction: string,
): VaultCompositionComponent => ({
  component_key: componentKey,
  label: componentKey,
  protocol: componentKey === 'aave_v3_musd' ? 'aave_v3' : 'morpho_v2',
  assets: [{ asset_symbol: 'mUSD', amount: '1', value_usd: '1' }],
  allocation_value_usd: allocationFraction,
  allocation_fraction: allocationFraction,
  organic_supply_apy: '0.1',
  incentive_apr: null,
  estimated_total_annual_rate: null,
  weighted_organic_apy_contribution: '0',
  weighted_incentive_apr_contribution: null,
  campaign_ends_at: null,
  source_links: [],
});

describe('MoneyVaultCompositionMarketsTable', () => {
  it('renders localized headers', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketsTable
        components={[createComponent('aave_v3_musd', '1')]}
        marketLabel="Markets"
        allocationLabel="Allocation"
        apyLabel="APY"
        networkLabel="Monad"
      />,
    );

    const marketHeader = getByTestId(
      MoneyVaultCompositionMarketsTableTestIds.MARKET_HEADER,
    );
    expect(marketHeader).toHaveTextContent('Markets');
    const allocationHeader = getByTestId(
      MoneyVaultCompositionMarketsTableTestIds.ALLOCATION_HEADER,
    );
    expect(allocationHeader).toHaveTextContent('Allocation');

    const apyHeader = getByTestId(
      MoneyVaultCompositionMarketsTableTestIds.APY_HEADER,
    );
    expect(apyHeader).toHaveTextContent('APY');
  });

  it('keeps headers visible and renders loading rows while loading', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketsTable
        components={[]}
        marketLabel="Markets"
        allocationLabel="Allocation"
        apyLabel="APY"
        networkLabel="Monad"
        isLoading
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionMarketsTableTestIds.MARKET_HEADER),
    ).toHaveTextContent('Markets');
    expect(
      getAllByTestId(MoneyVaultCompositionMarketRowTestIds.LOADING),
    ).toHaveLength(3);
  });

  it('filters zero allocations and preserves chart ordering', () => {
    const components = [
      createComponent('aave_v3_musd', '0.3'),
      createComponent('direct_idle_usdc', '0.6'),
      createComponent('morpho_v2_musd', '0'),
    ];

    const { getAllByTestId, queryByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketsTable
        components={components}
        marketLabel="Markets"
        allocationLabel="Allocation"
        apyLabel="APY"
        networkLabel="Monad"
      />,
    );

    const rows = getAllByTestId(
      /^money-vault-composition-market-row-(?:direct_idle_usdc|aave_v3_musd)$/,
    );

    expect(rows.map((row) => row.props.testID)).toEqual([
      MoneyVaultCompositionMarketRowTestIds.ROW('direct_idle_usdc'),
      MoneyVaultCompositionMarketRowTestIds.ROW('aave_v3_musd'),
    ]);
    expect(
      queryByTestId(
        MoneyVaultCompositionMarketRowTestIds.ROW('morpho_v2_musd'),
      ),
    ).not.toBeOnTheScreen();
  });
});
