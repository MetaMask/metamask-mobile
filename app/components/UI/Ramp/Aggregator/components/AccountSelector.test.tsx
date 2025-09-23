import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useRampSDK } from '../sdk';
import { useAccountName } from '../../../../hooks/useAccountName';

jest.mock('../sdk', () => ({
  useRampSDK: jest.fn(),
}));

jest.mock('../../../../hooks/useAccountName', () => ({
  useAccountName: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getRampNetworks: jest.fn(() => [
    { chainId: '1', name: 'Ethereum' },
    { chainId: '137', name: 'Polygon' },
  ]),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const defaultState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            'test-id': {
              address: '0x1234567890123456789012345678901234567890',
              id: 'test-id',
              metadata: {
                name: 'Test Account',
                keyring: { type: 'HD Key Tree' },
              },
              options: {},
              methods: [],
              type: 'eip155:eoa' as const,
            },
          },
          selectedAccount: 'test-id',
        },
      },
    },
  },
  settings: {
    avatarAccountType: 'Maskicon',
  },
};

const mockUseRampSDK = useRampSDK as jest.MockedFunction<typeof useRampSDK>;
const mockUseAccountName = useAccountName as jest.MockedFunction<
  typeof useAccountName
>;

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDK.mockReturnValue({
      selectedAddress: '0x1234567890123456789012345678901234567890',
    } as ReturnType<typeof useRampSDK>);
    mockUseAccountName.mockReturnValue('Test Account');
  });

  it('renders correctly with selected address', () => {
    renderWithProvider(<AccountSelector />, {
      state: defaultState,
    });

    expect(screen.getByText('Test Account')).toBeTruthy();
  });

  it('renders correctly without account name', () => {
    mockUseAccountName.mockReturnValue('');

    renderWithProvider(<AccountSelector />, {
      state: defaultState,
    });

    // Text should be empty but element should exist
    expect(screen.getByText('')).toBeTruthy();
  });

  it('renders loading state when no address', () => {
    mockUseRampSDK.mockReturnValue({
      selectedAddress: undefined,
    } as unknown as ReturnType<typeof useRampSDK>);

    const stateWithNoAddress = {
      ...defaultState,
      engine: {
        ...defaultState.engine,
        backgroundState: {
          ...defaultState.engine.backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '',
            },
          },
        },
      },
    };

    renderWithProvider(<AccountSelector />, {
      state: stateWithNoAddress,
    });

    // Should show loading text when no address
    expect(screen.getByText('Account is loading...')).toBeTruthy();
  });

  it('calls navigation when pressed', () => {
    renderWithProvider(<AccountSelector />, {
      state: defaultState,
    });

    fireEvent.press(screen.getByTestId('ramps-account-picker'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('handles isEvmOnly prop correctly', () => {
    renderWithProvider(<AccountSelector isEvmOnly />, {
      state: defaultState,
    });

    fireEvent.press(screen.getByTestId('ramps-account-picker'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'AccountSelector',
        params: expect.objectContaining({
          isEvmOnly: true,
        }),
      }),
    );
  });

  it('uses ramp networks for CAIP chain IDs', () => {
    renderWithProvider(<AccountSelector />, {
      state: defaultState,
    });

    fireEvent.press(screen.getByTestId('ramps-account-picker'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'AccountSelector',
        params: expect.objectContaining({
          isEvmOnly: undefined,
        }),
      }),
    );
  });
});
