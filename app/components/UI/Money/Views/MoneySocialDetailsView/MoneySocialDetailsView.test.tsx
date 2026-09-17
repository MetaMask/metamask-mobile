import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneySocialDetailsView from './MoneySocialDetailsView';
import { MoneySocialDetailsViewTestIds } from './MoneySocialDetailsView.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isSocialAdded: true,
    socialAccount: 'money.user@gmail.com',
    socialCreatedAt: new Date('2026-09-03T12:00:00.000Z'),
    socialProvider: 'google',
  }),
}));

describe('MoneySocialDetailsView', () => {
  it('shows the provider, account, dates, and wallet recovery usage', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneySocialDetailsView />,
    );

    expect(queryByText('Gmail')).toBeNull();
    expect(getByTestId(MoneySocialDetailsViewTestIds.PROVIDER_ICON)).toHaveProp(
      'name',
      'google',
    );
    expect(getByText('money.user@gmail.com')).toBeTruthy();
    expect(getByText('Linked on Sep 3, 2026')).toBeTruthy();
    expect(queryByText('Last used')).toBeNull();
    expect(queryByText('Today')).toBeNull();
    expect(getByText('Wallet recovery')).toBeTruthy();
    expect(queryByText('Verifying Money transactions')).toBeNull();
    expect(queryByText('Remove social login')).toBeNull();
  });
});
