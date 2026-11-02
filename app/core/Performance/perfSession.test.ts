import { NativeModules } from 'react-native';
import { setPerfSessionScreen } from './perfSession';

describe('setPerfSessionScreen', () => {
  const originalModule = NativeModules.MetaMaskPerfSession;

  afterEach(() => {
    if (originalModule === undefined) {
      delete NativeModules.MetaMaskPerfSession;
    } else {
      NativeModules.MetaMaskPerfSession = originalModule;
    }
  });

  it('forwards the screen name when the native module is registered', () => {
    const setScreen = jest.fn();
    NativeModules.MetaMaskPerfSession = { setScreen };

    setPerfSessionScreen('WalletView');

    expect(setScreen).toHaveBeenCalledWith('WalletView');
  });

  it('does nothing when the native module is not registered', () => {
    delete NativeModules.MetaMaskPerfSession;

    expect(() => setPerfSessionScreen('WalletView')).not.toThrow();
  });

  it('ignores a missing screen name', () => {
    const setScreen = jest.fn();
    NativeModules.MetaMaskPerfSession = { setScreen };

    setPerfSessionScreen(undefined);

    expect(setScreen).not.toHaveBeenCalled();
  });
});
