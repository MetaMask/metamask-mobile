import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import type { VaultCompositionComponent } from '../../../../types/moneyVaultComposition';
import MoneyVaultCompositionChart from './MoneyVaultCompositionChart';
import { MoneyVaultCompositionChartTestIds } from './MoneyVaultCompositionChart.testIds';

const mockReact = React;

jest.mock('react-native-svg', () => {
  const actual = jest.requireActual('react-native-svg');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    G: (props: Record<string, unknown>) => mockReact.createElement(View, props),
  };
});

const componentKeys: VaultCompositionComponent['component_key'][] = [
  'direct_idle_musd',
  'direct_idle_usdc',
  'aave_v3_musd',
  'morpho_v2_musd',
  'morpho_v2_usdc',
];

const createComponent = (
  componentKey: VaultCompositionComponent['component_key'],
  overrides: Partial<VaultCompositionComponent> = {},
): VaultCompositionComponent => ({
  component_key: componentKey,
  label: componentKey,
  protocol:
    componentKey === 'aave_v3_musd'
      ? 'aave_v3'
      : componentKey.startsWith('morpho')
        ? 'morpho_v2'
        : 'liquidity_buffer',
  assets: [],
  allocation_value_usd: '1',
  allocation_fraction: '0.2',
  organic_supply_apy: '0',
  incentive_apr: null,
  estimated_total_annual_rate: null,
  weighted_organic_apy_contribution: '0',
  weighted_incentive_apr_contribution: null,
  campaign_ends_at: null,
  source_links: [],
  ...overrides,
});

const createComponents = (count: number): VaultCompositionComponent[] =>
  componentKeys.slice(0, count).map((componentKey, index) =>
    createComponent(componentKey, {
      allocation_fraction: `${count - index}`,
    }),
  );

describe('MoneyVaultCompositionChart', () => {
  it.each([1, 3, 5])('renders exactly %i wedges', (count) => {
    const { getAllByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={createComponents(count)} />,
    );

    expect(
      getAllByTestId(/^money-vault-composition-chart-wedge-/),
    ).toHaveLength(count);
  });

  it('shows the highest true allocation by default', () => {
    const components = [
      createComponent('direct_idle_musd', {
        label: 'Highest allocation',
        allocation_fraction: '0.38000000000000000001',
      }),
      createComponent('direct_idle_usdc', {
        label: 'Lower allocation',
        allocation_fraction: '0.37999999999999999999',
      }),
    ];

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE),
    ).toHaveTextContent('38%');
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Highest allocation');
  });

  it('centers the SVG ring inside its viewBox', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={[createComponent('direct_idle_musd')]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.RING).props.transform,
    ).toBe('translate(100, 100)');
  });

  it('shows the API label under the true percentage', () => {
    const component = createComponent('direct_idle_musd', {
      label: 'Direct idle mUSD',
      allocation_fraction: '0.38',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[component]} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Direct idle mUSD');
  });

  it('renders an explicit empty state', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={[
          createComponent('direct_idle_musd', { allocation_fraction: '0' }),
        ]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.EMPTY),
    ).toHaveTextContent(strings('money.earnings.chart_empty'));
  });

  it('renders an explicit invalid state', () => {
    const component = createComponent('direct_idle_musd');

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[component, component]} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.INVALID),
    ).toHaveTextContent(strings('money.earnings.chart_invalid'));
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.INVALID).props
        .accessibilityRole,
    ).toBe('alert');
  });

  it('constrains long labels while preserving the full accessible value', () => {
    const longLabel =
      'Morpho vault allocation with a long translated component label';
    const component = createComponent('morpho_v2_musd', {
      label: longLabel,
      allocation_fraction: '1',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[component]} />,
    );
    const centerLabel = getByTestId(
      MoneyVaultCompositionChartTestIds.CENTER_LABEL,
    );

    expect(centerLabel.props.numberOfLines).toBe(2);
    expect(centerLabel.props.accessibilityLabel).toBe(longLabel);
  });

  it('keeps wedge colors stable when API response order changes', () => {
    const components = createComponents(3);
    const { getByTestId, rerender } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const colorsByKey = Object.fromEntries(
      components.map(({ component_key: componentKey }) => [
        componentKey,
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE(componentKey)).props
          .fill,
      ]),
    );

    rerender(
      <MoneyVaultCompositionChart components={[...components].reverse()} />,
    );

    components.forEach(({ component_key: componentKey }) => {
      expect(
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE(componentKey)).props
          .fill,
      ).toEqual(colorsByKey[componentKey]);
    });
  });

  it('assigns a stable theme color to an unknown component key', () => {
    const unknownComponent = createComponent(
      'future_component' as VaultCompositionComponent['component_key'],
    );
    const knownComponents = createComponents(5);
    const { getByTestId, rerender } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={[...knownComponents, unknownComponent]}
      />,
    );

    const wedge = getByTestId(
      MoneyVaultCompositionChartTestIds.WEDGE('future_component'),
    );
    const initialColor = wedge.props.fill;
    const knownColors = knownComponents.map(
      ({ component_key: componentKey }) =>
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE(componentKey)).props
          .fill,
    );

    expect(knownColors).not.toEqual(expect.arrayContaining([initialColor]));

    rerender(
      <MoneyVaultCompositionChart
        components={[...knownComponents, unknownComponent]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.WEDGE('future_component'))
        .props.fill,
    ).toEqual(initialColor);
  });

  it('keeps unknown component colors independent of response order', () => {
    const components = [
      createComponent(
        'future_component_a' as VaultCompositionComponent['component_key'],
      ),
      createComponent(
        'future_component_b' as VaultCompositionComponent['component_key'],
      ),
    ];
    const { getByTestId, rerender } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const colorsByKey = Object.fromEntries(
      components.map(({ component_key: componentKey }) => [
        componentKey,
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE(componentKey)).props
          .fill,
      ]),
    );

    rerender(
      <MoneyVaultCompositionChart components={[...components].reverse()} />,
    );

    components.forEach(({ component_key: componentKey }) => {
      expect(
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE(componentKey)).props
          .fill,
      ).toEqual(colorsByKey[componentKey]);
    });
  });
});
