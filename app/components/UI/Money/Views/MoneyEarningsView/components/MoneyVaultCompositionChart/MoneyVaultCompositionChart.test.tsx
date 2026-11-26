import React from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  type PanResponderGestureState,
} from 'react-native';
import { act } from '@testing-library/react-native';
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
  assets: [
    {
      asset_symbol: componentKey.endsWith('usdc') ? 'USDC' : 'mUSD',
      amount: '1',
      value_usd: '1',
    },
  ],
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

const createInteractionComponents = (): VaultCompositionComponent[] => [
  createComponent('direct_idle_musd', { allocation_fraction: '0.5' }),
  createComponent('direct_idle_usdc', { allocation_fraction: '0.3' }),
  createComponent('aave_v3_musd', { allocation_fraction: '0.2' }),
];

const createTouchEvent = (angleDegrees: number, radius = 100) => {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    nativeEvent: {
      locationX: 120 + Math.sin(angleRadians) * radius,
      locationY: 120 - Math.cos(angleRadians) * radius,
    },
  };
};

describe('MoneyVaultCompositionChart', () => {
  beforeEach(() => {
    jest.spyOn(PanResponder, 'create').mockImplementation((config) => ({
      panHandlers: {
        onStartShouldSetResponder: config.onStartShouldSetPanResponder
          ? (event) =>
              config.onStartShouldSetPanResponder?.(
                event,
                {} as PanResponderGestureState,
              ) ?? false
          : undefined,
        onMoveShouldSetResponder: config.onMoveShouldSetPanResponder
          ? (event) =>
              config.onMoveShouldSetPanResponder?.(
                event,
                {} as PanResponderGestureState,
              ) ?? false
          : undefined,
        onResponderGrant: config.onPanResponderGrant
          ? (event) =>
              config.onPanResponderGrant?.(
                event,
                {} as PanResponderGestureState,
              )
          : undefined,
        onResponderMove: config.onPanResponderMove
          ? (event) =>
              config.onPanResponderMove?.(event, {} as PanResponderGestureState)
          : undefined,
        onResponderRelease: config.onPanResponderRelease
          ? (event) =>
              config.onPanResponderRelease?.(
                event,
                {} as PanResponderGestureState,
              )
          : undefined,
        onResponderTerminate: config.onPanResponderTerminate
          ? (event) =>
              config.onPanResponderTerminate?.(
                event,
                {} as PanResponderGestureState,
              )
          : undefined,
        onResponderTerminationRequest: config.onPanResponderTerminationRequest
          ? (event) =>
              config.onPanResponderTerminationRequest?.(
                event,
                {} as PanResponderGestureState,
              ) ?? false
          : undefined,
      },
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a loading skeleton instead of the chart while loading', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[]} isLoading />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.LOADING),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyVaultCompositionChartTestIds.CHART),
    ).not.toBeOnTheScreen();
  });

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
    ).toHaveTextContent('Cash reserve · mUSD');
  });

  it('shows a lower bound for a positive allocation below one tenth of a percent', () => {
    const component = createComponent('direct_idle_musd', {
      allocation_fraction: '0.0005',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[component]} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE),
    ).toHaveTextContent('<0.1%');
  });

  it('centers the SVG ring inside its viewBox', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={[createComponent('direct_idle_musd')]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.RING).props.transform,
    ).toBe('translate(120, 120)');
  });

  it('shows the formatted protocol and asset label under the true percentage', () => {
    const component = createComponent('direct_idle_musd', {
      label: 'Direct idle mUSD',
      allocation_fraction: '0.38',
    });

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={[component]} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · mUSD');
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

  it('starts with the highest allocation selected', () => {
    const components = [
      createComponent('direct_idle_musd', {
        label: 'Highest allocation',
        allocation_fraction: '0.6',
      }),
      createComponent('direct_idle_usdc', {
        label: 'Lower allocation',
        allocation_fraction: '0.4',
      }),
    ];

    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CHART).props
        .accessibilityRole,
    ).toBe('adjustable');
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · mUSD');
  });

  it('selects a wedge on ring touch and preserves selection after release', () => {
    const components = createInteractionComponents();
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);
    const secondWedgeTouch = createTouchEvent(220);

    act(() => {
      expect(chart.props.onStartShouldSetResponder(secondWedgeTouch)).toBe(
        true,
      );
      chart.props.onResponderGrant(secondWedgeTouch, {});
      chart.props.onResponderRelease(secondWedgeTouch, {});
    });

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · USDC');
  });

  it('dims inactive wedges and expands the selected wedge while held', () => {
    const components = createInteractionComponents();
    const { getAllByTestId, getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);
    const wedges = getAllByTestId(/^money-vault-composition-chart-wedge-/);
    const normalPath = wedges[0].props.d;

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(60), {});
    });

    const selectedWedge = getByTestId(
      MoneyVaultCompositionChartTestIds.WEDGE('direct_idle_musd'),
    );
    const inactiveWedge = getByTestId(
      MoneyVaultCompositionChartTestIds.WEDGE('direct_idle_usdc'),
    );

    expect(selectedWedge.props.d).not.toBe(normalPath);
    expect(inactiveWedge.props.opacity).toBe(0.35);

    act(() => {
      chart.props.onResponderRelease(createTouchEvent(60), {});
    });

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.WEDGE('direct_idle_musd'))
        .props.d,
    ).toBe(normalPath);
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.WEDGE('direct_idle_usdc'))
        .props.opacity,
    ).toBeUndefined();
  });

  it('updates selection while dragging across wedges', () => {
    const components = createInteractionComponents();
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(60), {});
      chart.props.onResponderMove(createTouchEvent(220), {});
    });

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · USDC');
  });

  it('retains selection when dragging through a separator, hole, or outside', () => {
    const components = createInteractionComponents();
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(60), {});
      chart.props.onResponderMove(createTouchEvent(179.5));
      chart.props.onResponderMove(createTouchEvent(60, 20));
      chart.props.onResponderMove(createTouchEvent(60, 100));
    });

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · mUSD');
  });

  it('selects across the zero-degree boundary while dragging', () => {
    const components = [
      createComponent('direct_idle_musd', { allocation_fraction: '0.5' }),
      createComponent('direct_idle_usdc', { allocation_fraction: '0.5' }),
    ];
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(350), {});
      chart.props.onResponderMove(createTouchEvent(10), {});
    });

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · mUSD');
  });

  it('rejects touches that begin outside the painted ring', () => {
    const components = createInteractionComponents();
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    expect(
      chart.props.onStartShouldSetResponder(createTouchEvent(60, 20)),
    ).toBe(false);
    expect(
      chart.props.onStartShouldSetResponder(createTouchEvent(60, 120)),
    ).toBe(false);
    expect(chart.props.onStartShouldSetResponder(createTouchEvent(179.5))).toBe(
      false,
    );
  });

  it('restores parent scrolling when the gesture terminates', () => {
    const setScrollEnabled = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={createInteractionComponents()}
        setScrollEnabled={setScrollEnabled}
      />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(60), {});
      chart.props.onResponderTerminate(createTouchEvent(60), {});
    });

    expect(setScrollEnabled).toHaveBeenNthCalledWith(1, false);
    expect(setScrollEnabled).toHaveBeenNthCalledWith(2, true);
  });

  it('restores parent scrolling when the chart unmounts during interaction', () => {
    const setScrollEnabled = jest.fn();
    const { getByTestId, unmount } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={createInteractionComponents()}
        setScrollEnabled={setScrollEnabled}
      />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(60), {});
    });

    unmount();

    expect(setScrollEnabled).toHaveBeenLastCalledWith(true);
  });

  it('restores parent scrolling when data becomes empty', () => {
    const setScrollEnabled = jest.fn();
    const { rerender } = renderWithProvider(
      <MoneyVaultCompositionChart
        components={createInteractionComponents()}
        setScrollEnabled={setScrollEnabled}
      />,
    );

    rerender(
      <MoneyVaultCompositionChart
        components={[
          createComponent('direct_idle_musd', { allocation_fraction: '0' }),
        ]}
        setScrollEnabled={setScrollEnabled}
      />,
    );

    expect(setScrollEnabled).toHaveBeenLastCalledWith(true);
  });

  it('preserves the active wedge when refreshed data keeps it positive', () => {
    const components = createComponents(3);
    const { getByTestId, rerender } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(220), {});
      chart.props.onResponderRelease(createTouchEvent(220), {});
    });

    rerender(
      <MoneyVaultCompositionChart
        components={[
          createComponent('direct_idle_musd', { allocation_fraction: '0.8' }),
          createComponent('direct_idle_usdc', {
            allocation_fraction: '0.1',
            label: 'Refreshed active wedge',
          }),
          createComponent('aave_v3_musd', { allocation_fraction: '0.1' }),
        ]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · USDC');
  });

  it('selects the new maximum when the active wedge becomes non-positive', () => {
    const components = createComponents(3);
    const { getByTestId, rerender } = renderWithProvider(
      <MoneyVaultCompositionChart components={components} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    act(() => {
      chart.props.onResponderGrant(createTouchEvent(220), {});
      chart.props.onResponderRelease(createTouchEvent(220), {});
    });

    rerender(
      <MoneyVaultCompositionChart
        components={[
          createComponent('direct_idle_musd', { allocation_fraction: '0.1' }),
          createComponent('direct_idle_usdc', { allocation_fraction: '0' }),
          createComponent('aave_v3_musd', { allocation_fraction: '0.9' }),
        ]}
      />,
    );

    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Aave v3 · mUSD');
  });

  it('changes selection through accessibility increment and decrement actions', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={createInteractionComponents()} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    expect(chart.props.accessibilityActions).toEqual(
      expect.arrayContaining([{ name: 'increment' }, { name: 'decrement' }]),
    );

    act(() => {
      chart.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      });
    });
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · USDC');

    act(() => {
      chart.props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' },
      });
    });
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL),
    ).toHaveTextContent('Cash reserve · mUSD');
  });

  it('announces changed selection through accessibility', () => {
    const announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={createInteractionComponents()} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    announceForAccessibility.mockClear();

    act(() => {
      chart.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      });
    });

    expect(announceForAccessibility).toHaveBeenLastCalledWith(
      'direct_idle_usdc, 30%',
    );
  });

  it('exposes the active allocation without separately exposing center text', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyVaultCompositionChart components={createInteractionComponents()} />,
    );
    const chart = getByTestId(MoneyVaultCompositionChartTestIds.CHART);

    expect(chart.props.accessibilityLabel).toBe('direct_idle_musd, 50%');
    expect(chart.props.accessibilityValue).toEqual({
      min: 0,
      max: 2,
      now: 0,
      text: 'direct_idle_musd, 50%',
    });
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE).props
        .accessible,
    ).toBe(false);
    expect(
      getByTestId(MoneyVaultCompositionChartTestIds.CENTER_LABEL).props
        .accessible,
    ).toBe(false);
  });
});
