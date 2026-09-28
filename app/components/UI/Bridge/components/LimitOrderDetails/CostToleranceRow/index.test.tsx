import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import CostToleranceRow from './index';
import { CostToleranceRowSelectorsIDs } from './testIds';

const defaultProps = {
  value: '2%',
  onPress: jest.fn(),
};

describe('CostToleranceRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cost tolerance value', () => {
    const { getByTestId } = render(<CostToleranceRow {...defaultProps} />);

    expect(
      getByTestId(CostToleranceRowSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(CostToleranceRowSelectorsIDs.VALUE)).toHaveTextContent(
      '2%',
    );
  });

  it('renders the cost tolerance label', () => {
    const { getByText } = render(<CostToleranceRow {...defaultProps} />);

    expect(getByText(strings('bridge.cost_tolerance'))).toBeOnTheScreen();
  });

  it('calls onPress when the value is pressed', () => {
    const { getByTestId } = render(<CostToleranceRow {...defaultProps} />);

    fireEvent.press(getByTestId(CostToleranceRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <CostToleranceRow {...defaultProps} testID="custom-cost-tolerance-row" />,
    );

    expect(getByTestId('custom-cost-tolerance-row')).toBeOnTheScreen();
    expect(queryByTestId(CostToleranceRowSelectorsIDs.CONTAINER)).toBeNull();
  });
});
