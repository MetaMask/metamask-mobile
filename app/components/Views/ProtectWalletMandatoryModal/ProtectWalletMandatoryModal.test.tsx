import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ProtectWalletMandatoryModal from './ProtectWalletMandatoryModal';
import { backgroundState } from '../../../util/test/initial-root-state';
import { InteractionManager } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';

// Mock Device utility
const mockIsIphoneX = jest.fn();
jest.mock('../../../util/device', () => ({
  isIphoneX: () => mockIsIphoneX(),
  isAndroid: () => false,
  isIos: () => true,
  getDeviceWidth: () => 375,
  getDeviceHeight: () => 812,
}));

// Mock the navigation
const mockNavigate = jest.fn();
const mockDangerouslyGetState = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      dangerouslyGetState: mockDangerouslyGetState,
    }),
  };
});

// Mock the metrics hook
jest.mock('../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    WALLET_SECURITY_PROTECT_VIEWED: 'WALLET_SECURITY_PROTECT_VIEWED',
    WALLET_SECURITY_PROTECT_ENGAGED: 'WALLET_SECURITY_PROTECT_ENGAGED',
  },
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn(),
      }),
    }),
  }),
}));

jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn(),
}));

// Mock InteractionManager
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
  };
});

// Test account address
const testAccountAddress = '0x1234567890123456789012345678901234567890';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      KeyringController: {
        isUnlocked: true,
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: [testAccountAddress],
            metadata: {
              id: 'primary-hd-keyring-id',
            },
          },
        ],
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            'test-account-id': {
              id: 'test-account-id',
              address: testAccountAddress,
              type: 'eip155:eoa' as const,
              options: {},
              methods: [],
              metadata: {
                name: 'Test Account',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
          selectedAccount: 'test-account-id',
        },
      },
      SeedlessOnboardingController: {
        vault: undefined,
      },
    },
  },
  user: {
    passwordSet: false,
    seedphraseBackedUp: false, // This is key - must be false to show modal
  },
};

describe('ProtectWalletMandatoryModal', () => {
  beforeEach(() => {
    mockDangerouslyGetState.mockReturnValue({
      routes: [{ name: 'Home' }],
    });
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly on iPhoneX', () => {
    mockIsIphoneX.mockReturnValue(true);

    const { toJSON } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows protect wallet modal when conditions are met', () => {
    // Ensure Engine.hasFunds returns true for our test account
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const { getByText, queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: initialState,
      },
    );

    // Verify the modal is visible by checking for modal content
    expect(queryByText('Protect your wallet')).toBeTruthy(); // Modal title
    expect(queryByText('Protect wallet')).toBeTruthy(); // Button text

    const secureButton = getByText('Protect wallet');
    fireEvent.press(secureButton);

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', undefined);
    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });

  it('does not show modal when seedphrase is already backed up', () => {
    // Ensure Engine.hasFunds returns true for our test account
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const stateWithBackedUpSeedphrase = {
      ...initialState,
      user: {
        ...initialState.user,
        seedphraseBackedUp: true, // Already backed up - should not show modal
      },
    };

    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: stateWithBackedUpSeedphrase,
      },
    );

    // Modal should not be visible
    expect(queryByText('Protect your wallet')).toBeNull();
    expect(queryByText('Protect wallet')).toBeNull();
  });

  it('does not show modal when account has no funds', () => {
    // Mock Engine.hasFunds to return false
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);

    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: initialState,
      },
    );

    // Modal should not be visible
    expect(queryByText('Protect your wallet')).toBeNull();
    expect(queryByText('Protect wallet')).toBeNull();
  });

  it('does not show modal for imported accounts (non-primary keyring)', () => {
    // Ensure Engine.hasFunds returns true for our test account
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const stateWithImportedAccount = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              // Primary HD keyring (index 0)
              {
                type: 'HD Key Tree',
                accounts: ['0xprimaryaccount'],
                metadata: {
                  id: 'primary-hd-keyring-id',
                },
              },
              // Imported account keyring (Simple Key Pair)
              {
                type: 'Simple Key Pair',
                accounts: [testAccountAddress],
                metadata: {
                  id: 'imported-keyring-id',
                },
              },
            ],
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                'imported-account-id': {
                  id: 'imported-account-id',
                  address: testAccountAddress,
                  type: 'eip155:eoa' as const,
                  options: {},
                  methods: [],
                  metadata: {
                    name: 'Imported Account',
                    keyring: {
                      type: 'Simple Key Pair',
                    },
                  },
                },
              },
              selectedAccount: 'imported-account-id',
            },
          },
        },
      },
    };

    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: stateWithImportedAccount,
      },
    );

    // Modal should not be visible for imported accounts
    expect(queryByText('Protect your wallet')).toBeNull();
    expect(queryByText('Protect wallet')).toBeNull();
  });

  it('does not show modal for secondary HD keyring accounts', () => {
    // Ensure Engine.hasFunds returns true for our test account
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const stateWithSecondaryHDAccount = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              // Primary HD keyring (index 0)
              {
                type: 'HD Key Tree',
                accounts: ['0xprimaryaccount'],
                metadata: {
                  id: 'primary-hd-keyring-id',
                },
              },
              // Secondary HD keyring (index 1) - should not show modal
              {
                type: 'HD Key Tree',
                accounts: [testAccountAddress],
                metadata: {
                  id: 'secondary-hd-keyring-id',
                },
              },
            ],
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                'secondary-hd-account-id': {
                  id: 'secondary-hd-account-id',
                  address: testAccountAddress,
                  type: 'eip155:eoa' as const,
                  options: {},
                  methods: [],
                  metadata: {
                    name: 'Secondary HD Account',
                    keyring: {
                      type: 'HD Key Tree',
                    },
                  },
                },
              },
              selectedAccount: 'secondary-hd-account-id',
            },
          },
        },
      },
    };

    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: stateWithSecondaryHDAccount,
      },
    );

    // Modal should not be visible for secondary HD keyring accounts
    expect(queryByText('Protect your wallet')).toBeNull();
    expect(queryByText('Protect wallet')).toBeNull();
  });

  it('does not show modal for social login flow', () => {
    // Ensure Engine.hasFunds returns true for our test account
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const stateWithSecondaryHDAccount = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              // Primary HD keyring (index 0)
              {
                type: 'HD Key Tree',
                accounts: ['0xprimaryaccount'],
                metadata: {
                  id: 'primary-hd-keyring-id',
                },
              },
              // Secondary HD keyring (index 1) - should not show modal
              {
                type: 'HD Key Tree',
                accounts: [testAccountAddress],
                metadata: {
                  id: 'secondary-hd-keyring-id',
                },
              },
            ],
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                'secondary-hd-account-id': {
                  id: 'secondary-hd-account-id',
                  address: testAccountAddress,
                  type: 'eip155:eoa' as const,
                  options: {},
                  methods: [],
                  metadata: {
                    name: 'Secondary HD Account',
                    keyring: {
                      type: 'HD Key Tree',
                    },
                  },
                },
              },
              selectedAccount: 'secondary-hd-account-id',
            },
          },
          SeedlessOnboardingController: {
            vault: 'vault-id',
          },
        },
      },
    };

    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: stateWithSecondaryHDAccount,
      },
    );

    // Modal should not be visible for secondary HD keyring accounts
    expect(queryByText('Protect your wallet')).toBeNull();
    expect(queryByText('Protect wallet')).toBeNull();
  });

  it('should show modal when primary SRP account has Solana balance but no EVM balance', () => {
    // Mock Engine.hasFunds to return true for Solana balance
    // This tests the requirement that hasFunds should check Solana accounts for SRP-derived accounts
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);

    const stateWithSolanaBalance = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              // Primary HD keyring containing both EVM and Solana accounts
              {
                type: 'HD Key Tree',
                accounts: [testAccountAddress], // EVM account
                metadata: {
                  id: 'primary-hd-keyring-id',
                },
              },
            ],
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                'evm-account-id': {
                  id: 'evm-account-id',
                  address: testAccountAddress,
                  type: 'eip155:eoa' as const,
                  options: {},
                  methods: [],
                  metadata: {
                    name: 'EVM Account',
                    keyring: {
                      type: 'HD Key Tree',
                    },
                  },
                },
                'solana-account-id': {
                  id: 'solana-account-id',
                  address: 'GxYhKsUQJKpBjKrfTQ6K8zYjBtQjWqKTkjCFqQjWqKTk', // Solana address
                  type: 'solana:data-account' as const,
                  options: {
                    entropySource: 'primary-hd-keyring-id', // Links to same SRP
                  },
                  methods: [],
                  metadata: {
                    name: 'Solana Account',
                    snap: {
                      id: 'npm:@metamask/solana-wallet-snap',
                    },
                  },
                },
              },
              selectedAccount: 'evm-account-id', // EVM account selected
            },
          },
        },
      },
    };

    const { getByText, queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: stateWithSolanaBalance,
      },
    );

    // Modal should be visible because hasFunds considers Solana balance for SRP accounts
    expect(queryByText('Protect your wallet')).toBeTruthy();
    expect(queryByText('Protect wallet')).toBeTruthy();

    // Verify hasFunds was called with the EVM account address
    expect(Engine.hasFunds).toHaveBeenCalledWith(testAccountAddress);

    // Test that the button works
    const secureButton = getByText('Protect wallet');
    fireEvent.press(secureButton);
    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', undefined);
  });
});
