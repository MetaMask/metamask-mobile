import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyGradientText from './MoneyGradientText';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');

describe('MoneyGradientText', () => {
  it('renders the value text with the TEXT testID', () => {
    const { getByTestId } = render(<MoneyGradientText value="+$200.00" />);

    expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toBeOnTheScreen();
  });

  it('displays the provided value string', () => {
    const { getByTestId } = render(<MoneyGradientText value="+$1,500.00" />);

    expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toHaveTextContent(
      '+$1,500.00',
    );
  });

  it('renders correctly with an empty string value', () => {
    const { getByTestId } = render(<MoneyGradientText value="" />);

    expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toHaveTextContent(
      '',
    );
  });
});
