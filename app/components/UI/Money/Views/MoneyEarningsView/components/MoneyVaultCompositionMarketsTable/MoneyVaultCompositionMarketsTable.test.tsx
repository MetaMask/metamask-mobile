import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { createVaultCompositionComponent } from '../../../../__fixtures__/moneyVaultComposition';
import MoneyVaultCompositionMarketsTable from './MoneyVaultCompositionMarketsTable';
import { MoneyVaultCompositionMarketsTableTestIds } from './MoneyVaultCompositionMarketsTable.testIds';
import { MoneyVaultCompositionMarketRowTestIds } from '../MoneyVaultCompositionMarketRow/MoneyVaultCompositionMarketRow.testIds';

describe('MoneyVaultCompositionMarketsTable', () => {
  it('renders localized headers', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketsTable
        components={[
          createVaultCompositionComponent({
            component_key: 'aave_v3_musd',
            label: 'aave_v3_musd',
            protocol: 'aave_v3',
          }),
        ]}
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
      createVaultCompositionComponent({
        component_key: 'aave_v3_musd',
        allocation_value_usd: '0.3',
        allocation_fraction: '0.3',
      }),
      createVaultCompositionComponent({
        component_key: 'direct_idle_usdc',
        allocation_value_usd: '0.6',
        allocation_fraction: '0.6',
      }),
      createVaultCompositionComponent({
        component_key: 'morpho_v2_musd',
        allocation_value_usd: '0',
        allocation_fraction: '0',
      }),
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
