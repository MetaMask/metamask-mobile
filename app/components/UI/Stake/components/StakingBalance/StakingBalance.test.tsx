import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import StakingBalance from './StakingBalance';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: 'Asset',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

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
  it('render matches snapshot', () => {
    render(StakingBalance);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('redirects to StakeInputView on stake button click', () => {
    render(StakingBalance);

    fireEvent.press(screen.getByText(strings('stake.stake_more')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.STAKING.STAKE);
  });
});
