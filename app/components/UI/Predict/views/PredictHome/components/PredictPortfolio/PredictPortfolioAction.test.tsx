import React from 'react';
import { screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import PredictPortfolioAction from './PredictPortfolioAction';

describe('PredictPortfolioAction', () => {
  const defaultProps = {
    iconName: IconName.Add,
    label: 'Add funds',
    onPress: jest.fn(),
  };

  it('centers the label so translations that wrap stay aligned with the icon', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} />);

    expect(screen.getByText('Add funds')).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('keeps the label centered when disabled', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} disabled />);

    expect(screen.getByText('Add funds')).toHaveStyle({
      textAlign: 'center',
    });
  });
});
