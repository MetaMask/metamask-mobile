import React from 'react';
import { screen, render } from '@testing-library/react-native';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import StakingCta from './StakingCta';

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

  it('render matches snapshot', () => {
    render(<StakingCta chainId="0x1" estimatedRewardRate="2.6%" />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
