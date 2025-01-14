import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ChartTimespanButtonGroup, { ChartTimespanButtonGroupProps } from '.';
import { CHART_BUTTONS } from '../InteractiveTimespanChart.constants';
import { noop } from 'lodash';
import { strings } from '../../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

describe('ChartTimespanButtonGroup', () => {
  it('render matches snapshot', () => {
    const props: ChartTimespanButtonGroupProps = {
      buttons: CHART_BUTTONS,
      onTimePress: noop,
    };

    const { toJSON } = renderWithProvider(
      <ChartTimespanButtonGroup {...props} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('updates active timespan button onPress', async () => {
    const props: ChartTimespanButtonGroupProps = {
      buttons: CHART_BUTTONS,
      onTimePress: noop,
    };

    const { getByText } = renderWithProvider(
      <ChartTimespanButtonGroup {...props} />,
    );

    const oneMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.1M'),
    ).parent;

    const ACTIVE_COLOR = '#ffffff';
    const INACTIVE_COLOR = '#9fa6ae';

    // Inactive before press
    expect(oneMonthButton.props.style.color).toBe(INACTIVE_COLOR);

    fireEvent.press(oneMonthButton);

    // Active after press
    expect(oneMonthButton.props.style.color).toBe(ACTIVE_COLOR);
  });
});
