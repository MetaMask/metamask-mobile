import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import BreakdownRow from './BreakdownRow';

describe('BreakdownRow', () => {
  const defaultProps = {
    title: 'Trading fees',
    subtitle: 'Member pricing on swaps and perps',
    value: '+$125.81',
    testID: 'breakdown-row',
  };

  it('renders the title, subtitle, and value', () => {
    const { getByTestId, getByText } = render(
      <BreakdownRow {...defaultProps} />,
    );

    expect(getByTestId(defaultProps.testID)).toBeOnTheScreen();
    expect(getByText(defaultProps.title)).toBeOnTheScreen();
    expect(getByText(defaultProps.subtitle)).toBeOnTheScreen();
    expect(getByText(defaultProps.value)).toBeOnTheScreen();
  });

  it('renders a custom status value when provided', () => {
    const { getByText } = render(
      <BreakdownRow
        {...defaultProps}
        value="Active"
        valueColor={TextColor.SuccessDefault}
      />,
    );

    expect(getByText('Active')).toBeOnTheScreen();
  });
});
