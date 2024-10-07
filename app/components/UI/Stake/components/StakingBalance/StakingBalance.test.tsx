import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StakingBalance from './StakingBalance';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Image } from 'react-native';

jest.mock('../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn((_uri, success) => {
  success(100, 100); // Mock successful response for ETH native Icon Image
});

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
describe('StakingBalance', () => {
  beforeEach(() => jest.resetAllMocks());

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<StakingBalance />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('redirects to StakeInputView on stake button click', () => {
    const { getByText } = renderWithProvider(<StakingBalance />);

    fireEvent.press(getByText(strings('stake.stake_more')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
    });
  });
});
