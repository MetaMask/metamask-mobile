import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InteractiveTimespanChart, { InteractiveTimespanChartProps } from '.';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent, screen } from '@testing-library/react-native';
import { MOCK_VAULT_APYS_ONE_YEAR } from '../mockVaultRewards';
import BigNumber from 'bignumber.js';
import { fireLayoutEvent } from './InteractiveTimespanChart.testUtils';
import { formatChartDate } from './InteractiveTimespanChart.utils';

const props: InteractiveTimespanChartProps<
  (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
> = {
  dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
  yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
  defaultTitle: 'Interactive Timespan Chart',
  titleAccessor: (point) =>
    `${new BigNumber(point.daily_apy).toFixed(
      2,
      BigNumber.ROUND_DOWN,
    )}% ${strings('stake.apr')}`,
  defaultSubtitle: 'Displays Mock Data Points',
  subtitleAccessor: (point) => formatChartDate(point.timestamp),
};

let renderResult: ReturnType<typeof renderWithProvider>;

describe('InteractiveTimespanChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    renderResult = renderWithProvider(<InteractiveTimespanChart {...props} />);
    /**
     * react-native-svg-charts components listen for onLayout changes before they render any data.
     * You need to trigger these event handlers for each component in your tests.
     */
    fireLayoutEvent(screen.root, { width: 100, height: 100 });
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderResult;
    expect(toJSON()).toMatchSnapshot();
  });

  it('supports customizing color', async () => {
    const customColor = 'red';

    const testProps: InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    > = { ...props, graphOptions: { color: customColor } };

    const { toJSON, findByText, getByTestId } = renderWithProvider(
      <InteractiveTimespanChart {...testProps} />,
    );

    fireLayoutEvent(screen.root, { width: 100, height: 100 });

    const titleText = await findByText(testProps.defaultTitle);
    const plotLine = getByTestId('InteractiveChartPlotLine');

    const redColorARGB = 4294901760;

    expect(titleText?.props?.style?.color).toBe(customColor);
    expect(plotLine?.props?.stroke?.payload).toBe(redColorARGB);

    expect(toJSON()).toMatchSnapshot();
  });

  it('supports toggling between different timespans', () => {
    const { getByText, getByTestId } = renderResult;

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
