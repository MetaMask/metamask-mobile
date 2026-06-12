import React from 'react';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SearchingForDevice from './index';
import { AppThemeKey } from '../../../../util/theme/models';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import {
  __mockRiveFireState,
  __resetAllMocks as resetRiveMocks,
} from '../../../../__mocks__/rive-react-native';

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
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetRiveMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

  it('fires the Ledger reset trigger after the Rive ref is ready', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(__mockRiveFireState).toHaveBeenCalledWith('Ledger_states', 'reset');
    expect(Logger.log).toHaveBeenCalledWith(
      'Triggering Ledger searching animation',
    );
    expect(Logger.log).toHaveBeenCalledWith('Successfully fired reset trigger');
  });

  it('logs animation trigger errors without throwing', () => {
    const error = new Error('Rive trigger failed');
    __mockRiveFireState.mockImplementationOnce(() => {
      throw error;
    });

    renderWithProvider(<SearchingForDevice />, { state: initialState });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Error triggering Ledger searching Rive animation',
    );
  });

  it('logs Rive playback lifecycle callbacks', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });
    jest.clearAllMocks();

    screen.getByTestId('ledger-searching-animation').props.onPlay();
    screen.getByTestId('ledger-searching-animation').props.onPause();
    screen.getByTestId('ledger-searching-animation').props.onStop();

    expect(Logger.log).toHaveBeenCalledWith(
      'Ledger searching animation started playing',
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'Ledger searching animation paused',
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'Ledger searching animation stopped',
    );
  });

  it('clears the timeout on unmount', () => {
    const { unmount } = renderWithProvider(<SearchingForDevice />, {
      state: initialState,
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(__mockRiveFireState).not.toHaveBeenCalled();
  });

  it('renders the Rive animation with correct props', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    const rive = screen.getByTestId('ledger-searching-animation');
    expect(rive).toBeOnTheScreen();
    expect(rive.props.autoplay).toBe(true);
    expect(rive.props.fit).toBe('contain');
    expect(rive.props.alignment).toBe('center');
    expect(rive.props.artboardName).toBe('Ledger');
    expect(rive.props.stateMachineName).toBe('Ledger_states');
  });
});
