import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import PredictPortfolioAction from './PredictPortfolioAction';

describe('PredictPortfolioAction', () => {
  const defaultProps = {
    iconName: IconName.Add,
    label: 'Add funds',
    onPress: jest.fn(),
    testID: 'predict-portfolio-action',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes the supplied callback when pressed', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} />);

    fireEvent.press(screen.getByTestId(defaultProps.testID));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke the callback when disabled', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} disabled />);

    fireEvent.press(screen.getByTestId(defaultProps.testID));

    expect(defaultProps.onPress).not.toHaveBeenCalled();
  });
});
