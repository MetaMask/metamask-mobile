import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InteractiveTimespanChart, { InteractiveTimespanChartProps } from '.';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent, screen } from '@testing-library/react-native';
import { MOCK_VAULT_APYS_ONE_YEAR } from '../mockVaultRewards';
import BigNumber from 'bignumber.js';
import { fireLayoutEvent } from './InteractiveTimespanChart.testUtils';
import { noop } from 'lodash';
import { ChartButton } from './ChartTimespanButtonGroup/ChartTimespanButtonGroup.types';

const buttons: ChartButton[] = [
  { label: 'Label 1', value: 1 },
  { label: 'Label 2', value: 2 },
  { label: 'Label 3', value: 3 },
];

const DEFAULT_PROPS = {
  NUMBER_ARRAY: {
    title: 'Graph with number[] title',
    subtitle: 'Graph with number[] subtitle',
  },
  OBJECT_ARRAY: {
    title: 'Graph with object[] title',
    subtitle: 'Graph with object[] subtitle',
  },
};

const getProps = (dataPointsType: 'number' | 'object') => {
  if (dataPointsType === 'number') {
    return {
      dataPoints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      defaultTitle: DEFAULT_PROPS.NUMBER_ARRAY.title,
      defaultSubtitle: DEFAULT_PROPS.NUMBER_ARRAY.subtitle,
      onTimespanPressed: noop,
      isLoading: false,
      graphOptions: {
        timespanButtons: buttons,
      },
    } as InteractiveTimespanChartProps<number>;
  }
  return {
    dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
    defaultTitle: DEFAULT_PROPS.OBJECT_ARRAY.title,
    defaultSubtitle: DEFAULT_PROPS.OBJECT_ARRAY.subtitle,
    onTimespanPressed: noop,
    yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
    isLoading: false,
    graphOptions: {
      timespanButtons: buttons,
    },
  } as InteractiveTimespanChartProps<(typeof MOCK_VAULT_APYS_ONE_YEAR)[number]>;
};

/**
 * react-native-svg-charts components listen for onLayout changes before they render any data.
 * You need to trigger these event handlers for each component in your tests.
 */
const renderGraph = () => {
  fireLayoutEvent(screen.root, { width: 100, height: 100 });
};

describe('InteractiveTimespanChart', () => {
  it('render matches snapshot', () => {
    const props = getProps('object') as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { toJSON } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();
  });

  it('supports dataPoints as number[]', () => {
    const props = getProps('number') as InteractiveTimespanChartProps<number>;

    const { toJSON, getByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();

    // Timespan buttons rendering
    buttons.forEach(({ label }) => expect(getByText(label)).toBeDefined());

    // GraphTooltip
    expect(getByText(DEFAULT_PROPS.NUMBER_ARRAY.title)).toBeDefined();
    expect(getByText(DEFAULT_PROPS.NUMBER_ARRAY.subtitle)).toBeDefined();
  });

  it('supports dataPoints as object[]', () => {
    const props = getProps('object') as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { toJSON, getByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();

    // Timespan buttons rendering
    buttons.forEach(({ label }) => expect(getByText(label)).toBeDefined());

    // GraphTooltip
    expect(getByText(DEFAULT_PROPS.OBJECT_ARRAY.title)).toBeDefined();
    expect(getByText(DEFAULT_PROPS.OBJECT_ARRAY.subtitle)).toBeDefined();
  });

  it('renders no title or subtitle when defaultTitle, defaultSubtitle, titleAccessor, and subtitleAccessor are not defined', () => {
    const { defaultTitle, defaultSubtitle, ...props } = getProps(
      'object',
    ) as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { toJSON, getByText, queryByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();

    // Timespan buttons rendering
    buttons.forEach(({ label }) => expect(getByText(label)).toBeDefined());

    // GraphTooltip
    expect(queryByText(DEFAULT_PROPS.OBJECT_ARRAY.title)).toBeNull();
    expect(queryByText(DEFAULT_PROPS.OBJECT_ARRAY.subtitle)).toBeNull();
  });

  it('renders only the title when subtitle props are not defined', () => {
    const { defaultSubtitle, ...props } = getProps(
      'object',
    ) as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { toJSON, getByText, queryByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();

    // Timespan buttons rendering
    buttons.forEach(({ label }) => expect(getByText(label)).toBeDefined());

    // GraphTooltip
    expect(getByText(DEFAULT_PROPS.OBJECT_ARRAY.title)).toBeDefined();
    expect(queryByText(DEFAULT_PROPS.OBJECT_ARRAY.subtitle)).toBeNull();
  });

  it('renders only the subtitle when title props are not defined', () => {
    const { defaultTitle, ...props } = getProps(
      'object',
    ) as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { toJSON, getByText, queryByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    expect(toJSON()).toMatchSnapshot();

    // Timespan buttons rendering
    buttons.forEach(({ label }) => expect(getByText(label)).toBeDefined());

    // GraphTooltip
    expect(queryByText(DEFAULT_PROPS.OBJECT_ARRAY.title)).toBeNull();
    expect(getByText(DEFAULT_PROPS.OBJECT_ARRAY.subtitle)).toBeDefined();
  });

  it('supports customizing color', async () => {
    const customColor = 'red';

    const { graphOptions, ...props } = getProps(
      'object',
    ) as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { findByText, getByTestId } = renderWithProvider(
      <InteractiveTimespanChart
        {...{ graphOptions: { color: customColor }, ...props }}
      />,
    );

    renderGraph();

    const titleText = await findByText(DEFAULT_PROPS.OBJECT_ARRAY.title);
    const plotLine = getByTestId('InteractiveChartPlotLine');

    const redColorARGB = 4294901760;

    expect(titleText?.props?.style?.color).toBe(customColor);
    expect(plotLine?.props?.stroke?.payload).toBe(redColorARGB);
  });

  it('supports toggling between different timespans', () => {
    const { graphOptions, ...props } = getProps(
      'object',
    ) as InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    >;

    const { getByText, getByTestId } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    renderGraph();

    const oneMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.1M'),
    ).parent;

    const interactiveTimespanChart = getByTestId('InteractiveTimespanChart');
    const areaChartComponent =
      interactiveTimespanChart.children[2].children[0].children[0];

    // Chart defaults to 7 data points shown (1 week).
    expect(areaChartComponent.props.data.length).toEqual(7);

    // Display 30 data points (1 month).
    fireEvent.press(oneMonthButton);

    expect(areaChartComponent.props.data.length).toEqual(30);

    // Display 90 data points (3 months).
    const threeMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.3M'),
    ).parent;

    fireEvent.press(threeMonthButton);

    expect(areaChartComponent.props.data.length).toEqual(90);

    // Display 180 data points (6 months).
    const sixMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.6M'),
    ).parent;

    fireEvent.press(sixMonthButton);

    expect(areaChartComponent.props.data.length).toEqual(180);
  });
});
