import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import TabThumbnail from './TabThumbnail';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { RootState } from '../../../../reducers';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';

const mockTab = {
  url: 'https://example.com',
  image: 'test-image-uri',
  id: 123,
};

describe('TabThumbnail', () => {
  const mockOnClose = jest.fn();
  const mockOnSwitch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <TabThumbnail
        tab={mockTab}
        isActiveTab
        onClose={mockOnClose}
        onSwitch={mockOnSwitch}
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle tab switching', () => {
    const { getByLabelText } = renderWithProvider(
      <TabThumbnail
        tab={mockTab}
        isActiveTab={false}
        onClose={mockOnClose}
        onSwitch={mockOnSwitch}
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    const switchButton = getByLabelText(strings('browser.switch_tab'));
    fireEvent.press(switchButton);

    expect(mockOnSwitch).toHaveBeenCalledWith(mockTab);
  });

  it('should handle tab closing', () => {
    const { getByLabelText } = renderWithProvider(
      <TabThumbnail
        tab={mockTab}
        isActiveTab={false}
        onClose={mockOnClose}
        onSwitch={mockOnSwitch}
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    const closeButton = getByLabelText(strings('browser.close_tab'));
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith(mockTab);
  });

  it('should apply active tab styles when isActiveTab is true', () => {
    const { getByLabelText } = renderWithProvider(
      <TabThumbnail
        tab={mockTab}
        isActiveTab
        onClose={mockOnClose}
        onSwitch={mockOnSwitch}
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    const switchButton = getByLabelText(strings('browser.switch_tab'));
    expect(switchButton.props.style[1]).toBeTruthy(); // Check if activeTab style is applied
  });

  it('should not render footer when no selectedAccount', () => {
    const { queryByTestId } = renderWithProvider(
      <TabThumbnail
        tab={mockTab}
        isActiveTab={false}
        onClose={mockOnClose}
        onSwitch={mockOnSwitch}
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    expect(queryByTestId('footer-container')).toBeNull();
  });

  it('should render footer when there is a selectedAccount', () => {
    const mockAccount = {
      id: 'mock-account-id',
      address: '0x1234567890123456789012345678901234567890',
      metadata: {
        name: 'Test Account',
        keyring: { type: 'HD Key Tree' },
      },
      type: 'eip155:eoa',
      scopes: ['eip155:1'],
    };

    //  mock state is a bit complex because we need accounts
    // and specifically for them to have permission on the
    // specific website
    const mockState: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [mockAccount.id]: mockAccount,
              },
              selectedAccount: mockAccount.id,
            },
          },
          KeyringController: {
            keyrings: [],
            keyringsMetadata: [],
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          PermissionController: {
            subjects: {
              'example.com': {
                permissions: {
                  [Caip25EndowmentPermissionName]: {
                    caveats: [
                      {
                        type: Caip25CaveatType,
                        value: {
                          requiredScopes: {
                            'eip155:1': {
                              accounts: [`eip155:1:${mockAccount.address}`],
                            },
                          },
                          optionalScopes: {},
                          sessionProperties: {},
                          isMultichainOrigin: false,
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const { getByTestId } = renderWithProvider(
      <TabThumbnail
        tab={{
          url: 'https://example.com',
          image: 'https://example.com/favicon.ico',
          id: 0,
        }}
        isActiveTab
        onClose={jest.fn()}
        onSwitch={jest.fn()}
      />,
      { state: mockState },
    );
    expect(getByTestId('footer-container')).toBeTruthy();
  });
});
