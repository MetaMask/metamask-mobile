import React from 'react';
import { screen, render } from '@testing-library/react-native';
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
describe('StakingCta', () => {
  it('render matches snapshot', () => {
    render(<StakingCta estimatedRewardRate="2.6%" />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
