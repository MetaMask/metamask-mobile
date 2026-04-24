import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import StakingCta from './StakingCta';
import { strings } from '../../../../../../locales/i18n';

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
jest.mock('../../../../../hooks/useAnalytics/useAnalytics');

describe('StakingCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
  });

  it('renders staking cta text', () => {
    render(<StakingCta chainId="0x1" estimatedRewardRate="2.6%" />);
    expect(screen.getByText('2.6%')).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('stake.stake_your_eth_cta.learn_more_with_period'),
      ),
    ).toBeOnTheScreen();
  });
});
