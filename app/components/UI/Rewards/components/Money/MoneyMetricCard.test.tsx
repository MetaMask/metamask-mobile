import React from 'react';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import MoneyMetricCard from './MoneyMetricCard';

const renderCard = (
  props: Partial<React.ComponentProps<typeof MoneyMetricCard>> = {},
) =>
  renderWithProvider(
    <MoneyMetricCard
      iconName={IconName.UserCircleAdd}
      label="Referrals"
      amount="$41.75"
      caption="recorded claims"
      testID="metric-card"
      {...props}
    />,
    { state: { user: { appTheme: AppThemeKey.light } } },
  );

describe('MoneyMetricCard', () => {
  it('renders the label, amount, and caption', () => {
    const { getByText, getByTestId } = renderCard();

    expect(getByTestId('metric-card')).toBeOnTheScreen();
    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('recorded claims')).toBeOnTheScreen();
  });

  it('keeps the label and caption when there is no amount', () => {
    const { getByText, queryByText } = renderCard({ amount: null });

    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByText('recorded claims')).toBeOnTheScreen();
    expect(queryByText('$41.75')).not.toBeOnTheScreen();
  });

  it('hides a stale amount while loading', () => {
    const { queryByText } = renderCard({ isLoading: true });

    expect(queryByText('$41.75')).not.toBeOnTheScreen();
  });
});
