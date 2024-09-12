import React from 'react';
import StakingEarnings from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../Stake/constants', () => ({
  isPooledStakingFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('Staking Earnings', () => {
  it('should render correctly', () => {
    const { toJSON, getByText } = renderWithProvider(<StakingEarnings />);

    expect(getByText(strings('staking.your_earnings'))).toBeDefined();
    expect(getByText(strings('staking.annual_rate'))).toBeDefined();
    expect(getByText(strings('staking.lifetime_rewards'))).toBeDefined();
    expect(
      getByText(strings('staking.estimated_annual_earnings')),
    ).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });
});
