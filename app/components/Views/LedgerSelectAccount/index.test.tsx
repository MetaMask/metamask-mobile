import React from 'react';
import LedgerSelectAccount from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';

const mockedNavigate = jest.fn();

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () => ({
  __esModule: true,
  default: jest.fn((_deviceId?: string) => ({
    isSendingLedgerCommands: false,
    isAppLaunchConfirmationNeeded: false,
    ledgerLogicToRun: jest.fn(),
    error: undefined,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getAccounts: jest.fn(),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

describe('LedgerSelectAccount', () => {
  const mockKeyringController = MockEngine.context.KeyringController;

  beforeEach(() => {
    jest.clearAllMocks();

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        typeof useLedgerBluetooth
      >
    ).mockImplementation(() => ({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: undefined,
      cleanupBluetoothConnection(): void {
        throw new Error('Function not implemented.');
      },
    }));
  });

  it('renders correctly to match snapshot', () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);
    const wrapper = renderWithProvider(<LedgerSelectAccount />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders correctly to match snapshot when getAccounts return valid accounts', () => {
    mockKeyringController.getAccounts.mockResolvedValue([
      '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
      '0xa1e359811322d97991e03f863a0c30c2cf029cd',
    ]);
    const wrapper = renderWithProvider(<LedgerSelectAccount />);

    expect(wrapper).toMatchSnapshot();
  });
});
