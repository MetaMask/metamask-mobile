import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import ChartTimespanButtonGroup, { ChartTimespanButtonGroupProps } from '.';
import { CHART_BUTTONS } from '../InteractiveTimespanChart.constants';
import { noop } from 'lodash';
import { strings } from '../../../../../../../../locales/i18n';
import { act, fireEvent } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';

describe('ChartTimespanButtonGroup', () => {
  it('render matches snapshot', () => {
    const props: ChartTimespanButtonGroupProps = {
      buttons: CHART_BUTTONS,
      onPress: noop,
    };

    const { toJSON } = renderWithProvider(
      <ChartTimespanButtonGroup {...props} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('updates active timespan button onPress', async () => {
    const props: ChartTimespanButtonGroupProps = {
      buttons: CHART_BUTTONS,
      onPress: noop,
    };

    const { getByText } = renderWithProvider(
      <ChartTimespanButtonGroup {...props} />,
    );

    const oneMonthButton = getByText(
      strings('stake.interactive_chart.timespan_buttons.1M'),
      // Component hierarchy: ChartTimespanButton < Text < Text < RCTText
    )?.parent?.parent?.parent;

    if (!oneMonthButton) {
      throw new Error('Could not find one month button');
    }

    const INACTIVE_COLOR = lightTheme.colors.background.default;
    const ACTIVE_COLOR = lightTheme.colors.background.muted;

    // Inactive before press
    expect(oneMonthButton.props.style.backgroundColor).toBe(INACTIVE_COLOR);

    await act(() => {
      fireEvent.press(oneMonthButton);
    });

    // Active after press
    expect(oneMonthButton.props.style.backgroundColor).toBe(ACTIVE_COLOR);
  });
});
