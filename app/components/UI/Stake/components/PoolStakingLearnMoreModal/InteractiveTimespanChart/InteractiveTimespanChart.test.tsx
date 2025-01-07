import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import InteractiveTimespanChart, { InteractiveTimespanChartProps } from '.';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import { AreaChart } from 'react-native-svg-charts';
import { MOCK_VAULT_APYS_ONE_YEAR } from '../mockVaultRewards';
import BigNumber from 'bignumber.js';
import GraphTooltip from './GraphTooltip';

jest.mock('react-native-svg-charts', () => ({
  ...jest.requireActual('react-native-svg-charts'),
  AreaChart: jest.fn(),
}));

jest.mock('./GraphTooltip', () => {
  const actualComponent = jest.requireActual('./GraphTooltip');
  return {
    __esModule: true,
    default: jest.fn(actualComponent.default),
  };
});

describe('InteractiveTimespanChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('render matches snapshot', () => {
    const props: InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    > = {
      dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
      defaultTitle: 'Interactive Timespan Chart',
      defaultSubtitle: 'Displays Mock Data Points',
      yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
    };

    const { toJSON } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('supports customizing color', () => {
    const props: InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    > = {
      dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
      defaultTitle: 'Interactive Timespan Chart',
      defaultSubtitle: 'Displays Mock Data Points',
      yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
    };

    const { toJSON } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  // TODO: Maybe just write a playwrigh test?
  it('supports toggling between different timespans', () => {
    const props: InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    > = {
      dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
      defaultTitle: 'Interactive Timespan Chart',
      defaultSubtitle: 'Displays Mock Data Points',
      yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
    };

    const { getByText } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    const oneMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.1M'),
    ).parent;

    fireEvent.press(oneMonthButton);

    expect((AreaChart as jest.Mock).mock.calls.length).toBe(2);
    expect((AreaChart as jest.Mock).mock.calls[0][0].data.length).toBe(7);
    expect((AreaChart as jest.Mock).mock.calls[1][0].data.length).toBe(30);
  });

  it.only('displays GraphTooltip when a point is pressed', () => {
    const props: InteractiveTimespanChartProps<
      (typeof MOCK_VAULT_APYS_ONE_YEAR)[number]
    > = {
      dataPoints: MOCK_VAULT_APYS_ONE_YEAR,
      defaultTitle: 'Interactive Timespan Chart',
      defaultSubtitle: 'Displays Mock Data Points',
      yAccessor: (point) => new BigNumber(point.daily_apy).toNumber(),
    };

    const { getByTestId } = renderWithProvider(
      <InteractiveTimespanChart {...props} />,
    );

    const plotLine = getByTestId('InteractiveChartPlotLine');

    fireEvent.press(plotLine);

    expect(GraphTooltip).toHaveBeenCalledWith({ test });
  });

  it.todo('displays GraphCursor when a point is pressed');
});
