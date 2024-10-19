import React from 'react';
import StakingEarnings from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../constants', () => ({
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

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

describe('Staking Earnings', () => {
  it('should render correctly', () => {
    const { toJSON, getByText } = renderWithProvider(<StakingEarnings />);

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(getByText(strings('stake.annual_rate'))).toBeDefined();
    expect(getByText(strings('stake.lifetime_rewards'))).toBeDefined();
    expect(getByText(strings('stake.estimated_annual_earnings'))).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });
});
