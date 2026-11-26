import React from 'react';
import { StyleSheet } from 'react-native';
import { TextColor } from '@metamask/design-system-react-native';
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
  estimated_total_annual_rate: '0.051',
  weighted_organic_apy_contribution: '0',
  weighted_incentive_apr_contribution: null,
  campaign_ends_at: null,
  source_links: [],
  ...overrides,
});

describe('MoneyVaultCompositionMarketRow', () => {
  it('renders loading placeholders without component data', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow isLoading networkLabel="Monad" />,
    );

    expect(
      getByTestId(MoneyVaultCompositionMarketRowTestIds.LOADING),
    ).toBeOnTheScreen();
  });

  it('renders market, asset, allocation, and estimated APY values', () => {
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
    ).toHaveTextContent('Aave v3 • Monad');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('MetaMask USD');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.ALLOCATION(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('38%');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
      ),
    ).toHaveTextContent('5.1%');
  });

  it('renders unavailable when estimated APY is null', () => {
    const component = createComponent({
      estimated_total_annual_rate: null,
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
      ),
    ).toHaveTextContent(strings('money.earnings.unavailable'));
  });

  it('renders a dash for a zero estimated APY', () => {
    const component = createComponent({ estimated_total_annual_rate: '0' });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
      ),
    ).toHaveTextContent('—');
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
        MoneyVaultCompositionMarketRowTestIds.PRIMARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('Cash reserve');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('MetaMask USD');
  });

  it('uses estimated APY instead of organic supply APY', () => {
    const component = createComponent({
      organic_supply_apy: '0.9',
      estimated_total_annual_rate: '0.0123',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
      ),
    ).toHaveTextContent('1.2%');
  });

  it('rounds allocation and APY values to one decimal place', () => {
    const component = createComponent({
      allocation_fraction: '0.1235',
      estimated_total_annual_rate: '0.1235',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionMarketRow
        component={component}
        networkLabel="Monad"
      />,
    );

    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.ALLOCATION(
          component.component_key,
        ),
      ),
    ).toHaveTextContent('12.4%');
    expect(
      getByTestId(
        MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
      ),
    ).toHaveTextContent('12.4%');
  });

  it('uses the shared chart color and hides the indicator from accessibility', () => {
    const component = createComponent();

    const { getByTestId, UNSAFE_getAllByProps: getAllByProps } =
      renderWithProvider(
        <MoneyVaultCompositionMarketRow
          component={component}
          networkLabel="Monad"
        />,
      );
    const row = getByTestId(
      MoneyVaultCompositionMarketRowTestIds.ROW(component.component_key),
    );
    const indicator = getByTestId(
      MoneyVaultCompositionMarketRowTestIds.INDICATOR(component.component_key),
    );
    expect(row.props.accessible).toBe(false);
    expect(indicator.props.accessible).toBe(false);
    expect(StyleSheet.flatten(indicator.props.style).backgroundColor).toBe(
      getVaultCompositionComponentColor(
        component.component_key,
        mockTheme.colors,
      ),
    );
    expect(
      getAllByProps({
        testID: MoneyVaultCompositionMarketRowTestIds.APY(
          component.component_key,
        ),
      }).find((node) => node.props.color !== undefined)?.props.color,
    ).toBe(TextColor.SuccessDefault);
  });
});
