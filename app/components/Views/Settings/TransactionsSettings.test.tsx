import React from 'react';
import { Switch } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { strings } from '../../../../locales/i18n';
import { setShowHexData } from '../../../actions/settings';
import TransactionsSettings from './TransactionsSettings';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const initialState = {
  settings: { showHexData: false },
  engine: { backgroundState },
};

describe('TransactionsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches setShowHexData when the show hex data toggle changes', () => {
    const { getByText, UNSAFE_getAllByType } = renderWithProvider(
      <TransactionsSettings />,
      { state: initialState },
    );
    expect(getByText(strings('app_settings.show_hex_data'))).toBeOnTheScreen();

    const switches = UNSAFE_getAllByType(Switch);
    const hexSwitch = switches[1];
    fireEvent(hexSwitch, 'valueChange', true);

    expect(mockDispatch).toHaveBeenCalledWith(setShowHexData(true));
  });
});
