import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SearchingForDevice from './index';
import {
  LEDGER_ARTBOARD_NAME,
  LEDGER_RIVE_STATE_TRIGGER,
  LEDGER_STATE_MACHINE_NAME,
} from '../ledgerRiveConstants';
import { AppThemeKey } from '../../../../util/theme/models';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import {
  __mockRiveTriggerInput,
  __resetRiveMocks as resetRiveMocks,
  Alignment,
  Fit,
  RiveView,
} from '../../../../__mocks__/rive-app-react-native';

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const initialState = {
  user: {
    appTheme: AppThemeKey.dark,
  },
};

describe('SearchingForDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRiveMocks();
  });

  it('renders the Figma loading copy', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    expect(
      screen.getByText(strings('ledger.looking_for_device')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('ledger.wait_while_we_search_for_it')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('hardware-wallet-searching-content'),
    ).toBeOnTheScreen();
  });

  it('renders the Bluetooth-off copy', () => {
    renderWithProvider(<SearchingForDevice isBluetoothOff />, {
      state: initialState,
    });

    expect(screen.getByText(strings('ledger.bluetooth_off'))).toBeOnTheScreen();
    expect(
      screen.getByText(strings('ledger.bluetooth_off_message')),
    ).toBeOnTheScreen();
  });

  it('fires the Ledger reset trigger when the Rive view is ready', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    expect(__mockRiveTriggerInput).toHaveBeenCalledWith(
      LEDGER_RIVE_STATE_TRIGGER.Reset,
    );
  });

  it('logs animation trigger errors without throwing', () => {
    const error = new Error('Rive trigger failed');
    __mockRiveTriggerInput.mockImplementationOnce(() => {
      throw error;
    });

    renderWithProvider(<SearchingForDevice />, { state: initialState });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Error triggering Ledger searching Rive animation',
    );
  });

  it('renders the Rive animation with correct props', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    expect(screen.getByTestId('ledger-searching-animation')).toBeOnTheScreen();
    const rive = screen.UNSAFE_getByType(RiveView);
    expect(rive.props.autoPlay).toBe(true);
    expect(rive.props.fit).toBe(Fit.Contain);
    expect(rive.props.alignment).toBe(Alignment.Center);
    expect(rive.props.artboardName).toBe(LEDGER_ARTBOARD_NAME);
    expect(rive.props.stateMachineName).toBe(LEDGER_STATE_MACHINE_NAME);
  });
});
