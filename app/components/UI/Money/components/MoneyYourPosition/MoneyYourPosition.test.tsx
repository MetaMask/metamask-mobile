import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyYourPosition from './MoneyYourPosition';
import { MoneyYourPositionTestIds } from './MoneyYourPosition.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

describe('MoneyYourPosition', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyYourPosition />);

    expect(getByText(strings('money.your_position.title'))).toBeOnTheScreen();
  });

  it('renders current rate with APY value', () => {
    const { getByText } = render(<MoneyYourPosition />);

    expect(
      getByText(strings('money.your_position.current_rate')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('money.apy_label', { percentage: String(MUSD_CONVERSION_APY) }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders lifetime earnings label', () => {
    const { getByText } = render(<MoneyYourPosition />);

    expect(
      getByText(strings('money.your_position.lifetime_earnings')),
    ).toBeOnTheScreen();
  });

  it('renders available balance label', () => {
    const { getByText } = render(<MoneyYourPosition />);

    expect(
      getByText(strings('money.your_position.available_balance')),
    ).toBeOnTheScreen();
  });

  it('renders with correct test IDs', () => {
    const { getByTestId, getAllByTestId } = render(<MoneyYourPosition />);

    expect(getByTestId(MoneyYourPositionTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyYourPositionTestIds.CURRENT_RATE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyYourPositionTestIds.AVAILABLE_BALANCE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyYourPositionTestIds.LIFETIME_EARNINGS),
    ).toBeOnTheScreen();
  });
});
