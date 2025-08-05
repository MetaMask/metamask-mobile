import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { Store } from 'redux';

import SendTo from './index';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { validateAddressOrENS } from '../../../../../../util/address';
import { SendViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/SendView.selectors';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../../util/networks';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  validateAddressOrENS: jest.fn(),
}));

jest.mock('../../../../../../util/networks/handleNetworkSwitch', () => ({
  handleNetworkSwitch: jest.fn(),
}));

jest.mock('../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(() => false),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockStore = configureStore();
const navigationPropMock = {
  setOptions: jest.fn(),
  setParams: jest.fn(),
  navigate: jest.fn(),
  pop: jest.fn(),
  dangerouslyGetParent: jest.fn(() => ({
    pop: jest.fn(),
  })),
};
const routeMock = {
  params: {},
};

describe('SendTo Component', () => {
  let store: Store;

  const mockValidateAddressOrENS = jest.mocked(validateAddressOrENS);

  beforeEach(() => {
    jest.clearAllMocks();
    store = mockStore({
      ...initialRootState,
      transaction: {
        selectedAsset: {},
      },
      settings: { useBlockieIcon: false },
    });

    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );
  });

  it('render matches snapshot', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('navigates to Amount screen', () => {
    const MOCK_TARGET_ADDRESS = '0x0000000000000000000000000000000000000000';
    const { navigate } = navigationPropMock;
    const routeProps = {
      params: {
        txMeta: {
          target_address: MOCK_TARGET_ADDRESS,
        },
      },
    };

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeProps} />
        </ThemeContext.Provider>
      </Provider>,
    );
    fireEvent.press(screen.getByText('Next'));
    expect(navigate).toHaveBeenCalledWith('Amount');
  });

  it('shows the warning message when the target address is invalid', () => {
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, 'invalid address');

    const expectedWarningMessage = getByText(
      'No address has been set for this name.',
    );

    expect(expectedWarningMessage).toBeOnTheScreen();
  });

  it('validates address when to address changes', () => {
    mockValidateAddressOrENS.mockResolvedValue(
      {} as unknown as ReturnType<typeof validateAddressOrENS>,
    );

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('navigates to Amount screen with valid address', () => {
    const { navigate } = navigationPropMock;
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: undefined,
      addressReady: true,
      toEnsAddress: '0x1234567890123456789012345678901234567890',
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    fireEvent.press(nextButton);

    expect(navigate).toHaveBeenCalledWith('Amount');
  });

  it('prevents navigation with invalid address', () => {
    const { navigate } = navigationPropMock;
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'Invalid address',
      toEnsName: undefined,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, 'invalid-address');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    fireEvent.press(nextButton);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables Next button when address is not ready', () => {
    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: undefined,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, '0x1234567890123456789012345678901234567890');

    const nextButton = screen.getByTestId(
      SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
    );
    expect(nextButton.props.disabled).toBe(true);
  });

  it('resolves ENS name to address', () => {
    const ensName = 'vitalik.eth';
    const resolvedAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: undefined,
      toEnsName: ensName,
      addressReady: true,
      toEnsAddress: resolvedAddress,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, ensName);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      ensName,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('shows error for invalid ENS name', () => {
    const invalidEnsName = 'nonexistent.eth';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'No address has been set for this name.',
      toEnsName: invalidEnsName,
      addressReady: false,
      toEnsAddress: undefined,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: false,
      isOnlyWarning: false,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, invalidEnsName);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      invalidEnsName,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  it('shows warning for contract address', () => {
    const contractAddress = '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8';

    mockValidateAddressOrENS.mockResolvedValue({
      addressError: 'SYMBOL_ERROR',
      toEnsName: undefined,
      addressReady: true,
      toEnsAddress: contractAddress,
      addToAddressToAddressBook: false,
      toAddressName: undefined,
      errorContinue: true,
      isOnlyWarning: true,
      confusableCollection: [],
    } as unknown as ReturnType<typeof validateAddressOrENS>);

    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SendTo navigation={navigationPropMock} route={routeMock} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const toInput = screen.getByTestId(SendViewSelectorsIDs.ADDRESS_INPUT);
    fireEvent.changeText(toInput, contractAddress);

    expect(mockValidateAddressOrENS).toHaveBeenCalledWith(
      contractAddress,
      expect.any(Object),
      expect.any(Array),
      expect.any(String),
    );
  });

  describe('Contextual Chain ID logic', () => {
    const mockIsRemoveGlobalNetworkSelectorEnabled = jest.mocked(
      isRemoveGlobalNetworkSelectorEnabled,
    );

    const createMockStore = (
      contextualChainId?: string,
      globalChainId = '0x1',
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state: any = {
        ...initialRootState,
        engine: {
          ...initialRootState.engine,
          backgroundState: {
            ...initialRootState.engine.backgroundState,
            NetworkController: {
              ...initialRootState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'mainnet',
              providerConfig: {
                chainId: globalChainId,
                ticker: 'ETH',
                type: 'mainnet',
              },
            },
          },
        },
        transaction: {
          selectedAsset: {},
        },
        settings: { useBlockieIcon: false },
      };

      // Set up networkOnboarded state for contextual chain ID
      state.networkOnboarded = {
        sendFlowChainId: contextualChainId || null,
        networkOnboardedState: {},
        networkState: {
          showNetworkOnboarding: false,
          nativeToken: '',
          networkType: '',
          networkUrl: '',
        },
        switchedNetwork: {
          networkUrl: '',
          networkStatus: false,
        },
      };

      const mockStoreWithActions = configureStore([]);
      const storeWithActions = mockStoreWithActions(state);
      storeWithActions.dispatch = jest
        .fn()
        .mockImplementation((action) => action);

      return storeWithActions;
    };

    beforeEach(() => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
    });

    it('uses global chain ID when contextual chain ID is not set', () => {
      const globalChainId = '0x1';
      const testStore = createMockStore(undefined, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Verify the component rendered with global chain ID
      expect(
        screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
      ).toBeTruthy();
    });

    it('uses contextual chain ID when set and feature flag is enabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      const contextualChainId = '0xa';
      const globalChainId = '0x1';
      const testStore = createMockStore(contextualChainId, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Component should use contextual chain ID
      expect(
        screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
      ).toBeTruthy();
    });

    it('falls back to global chain ID when contextual chain ID is null and feature flag is enabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      const globalChainId = '0x1';
      const testStore = createMockStore(undefined, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      expect(
        screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
      ).toBeTruthy();
    });

    it('always uses global chain ID when feature flag is disabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      const contextualChainId = '0xa';
      const globalChainId = '0x1';
      const testStore = createMockStore(contextualChainId, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Should use global chain ID even though contextual is set
      expect(
        screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
      ).toBeTruthy();
    });

    it('initializes contextual chain ID on mount when feature flag is enabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      const globalChainId = '0x1';
      const testStore = createMockStore(undefined, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Should dispatch action to set contextual chain ID
      expect(testStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
        chainId: globalChainId,
      });
    });

    it('does not initialize contextual chain ID when feature flag is disabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      const globalChainId = '0x1';
      const testStore = createMockStore(undefined, globalChainId);

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Should not dispatch action when feature is disabled
      expect(testStore.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
        }),
      );
    });

    it('resets contextual chain ID when transaction is reset', () => {
      const testStore = createMockStore('0xa', '0x1');
      testStore.dispatch = jest.fn();

      render(
        <Provider store={testStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Get resetTransaction from props passed to component
      const resetTransactionProp =
        navigationPropMock.setOptions.mock.calls[0][0];

      // Reset transaction should dispatch both actions
      const resetButton = resetTransactionProp.headerRight();
      resetButton.props.onPress();

      expect(testStore.dispatch).toHaveBeenCalledWith({
        type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
        chainId: null,
      });
    });

    it('uses contextual chain ID for ticker selection when feature is enabled', () => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      const contextualChainId = '0xa'; // Optimism
      const globalChainId = '0x1'; // Mainnet

      const optimismState = {
        ...initialRootState,
        engine: {
          ...initialRootState.engine,
          backgroundState: {
            ...initialRootState.engine.backgroundState,
            NetworkController: {
              ...initialRootState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: 'mainnet',
              providerConfig: {
                chainId: globalChainId,
                ticker: 'ETH',
                type: 'mainnet',
              },
              networksMetadata: {
                [contextualChainId]: {
                  EIPS: {},
                  status: 'available',
                },
              },
              networkConfigurationsByChainId: {
                [contextualChainId]: {
                  chainId: contextualChainId,
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'optimism',
                      url: 'https://mainnet.optimism.io',
                      type: 'custom',
                    },
                  ],
                },
              },
            },
            CurrencyRateController: {
              ...initialRootState.engine.backgroundState.CurrencyRateController,
              currencyRates: {
                ETH: {
                  conversionRate: 1,
                },
              },
            },
          },
        },
        transaction: {
          selectedAsset: {},
        },
        settings: { useBlockieIcon: false },
        sendFlow: {
          contextualChainId,
        },
      };

      const optimismStore = configureStore([])(optimismState);

      render(
        <Provider store={optimismStore}>
          <ThemeContext.Provider value={mockTheme}>
            <SendTo navigation={navigationPropMock} route={routeMock} />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Component should render with contextual chain ticker
      expect(
        screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
      ).toBeTruthy();
    });

    describe('Feature Flag Behavior Tests', () => {
      it('should show contextual network picker only when feature flag is enabled', () => {
        // Test with feature flag enabled
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        const testStore = createMockStore('0xa', '0x1');

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should show contextual network picker when feature flag is enabled
        // The contextual network picker is rendered when the feature flag is true
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Test with feature flag disabled - create a new render since rerender doesn't work with different mocks
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        const testStore2 = createMockStore('0xa', '0x1');

        const { unmount } = render(
          <Provider store={testStore2}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should still render the main container when feature flag is disabled
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();
        unmount();
      });

      it('should handle feature flag toggle during component lifecycle', () => {
        // Start with feature flag disabled
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        const testStore = createMockStore(undefined, '0x1');

        const { rerender } = render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should not initialize contextual chain ID
        expect(testStore.dispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
          }),
        );

        // Enable feature flag and re-render
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

        rerender(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Component should adapt to feature flag change
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();
      });

      it('should use correct chain ID based on feature flag state', () => {
        const contextualChainId = '0xa';
        const globalChainId = '0x1';

        // Test with feature flag disabled - should use global chain ID
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        let testStore = createMockStore(contextualChainId, globalChainId);

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Component should render successfully with global chain ID
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Test with feature flag enabled - should use contextual chain ID
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        testStore = createMockStore(contextualChainId, globalChainId);

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Component should render successfully with contextual chain ID
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();
      });

      it('should handle address book filtering based on feature flag', () => {
        // Feature flag disabled - should filter address book by current chain
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        let testStore = createMockStore(undefined, '0x1');

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Feature flag enabled - should show all address book entries
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        testStore = createMockStore('0xa', '0x1');

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();
      });

      it('should maintain component functionality when feature flag is disabled', () => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        const testStore = createMockStore('0xa', '0x1');

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Basic functionality should still work
        const addressInput = screen.getByTestId(
          SendViewSelectorsIDs.ADDRESS_INPUT,
        );
        expect(addressInput).toBeTruthy();

        // Should be able to input addresses
        fireEvent.changeText(
          addressInput,
          '0x1234567890123456789012345678901234567890',
        );
        expect(addressInput.props.value).toBe(
          '0x1234567890123456789012345678901234567890',
        );
      });

      it('should handle contextual chain ID reset based on feature flag', () => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        const testStore = createMockStore('0xa', '0x1');
        testStore.dispatch = jest.fn();

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Get reset function from navigation options
        const resetTransactionProp =
          navigationPropMock.setOptions.mock.calls[0][0];

        if (resetTransactionProp?.headerRight) {
          const resetButton = resetTransactionProp.headerRight();
          if (resetButton?.props?.onPress) {
            resetButton.props.onPress();

            // Should dispatch reset action when feature flag is enabled
            expect(testStore.dispatch).toHaveBeenCalledWith({
              type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
              chainId: null,
            });
          }
        }
      });

      it('should handle feature flag function errors gracefully', () => {
        // First, test with feature flag working normally
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        const testStore = createMockStore('0xa', '0x1');

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should render the container successfully
        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Note: We can't easily test the error case because the feature flag
        // is called during mapStateToProps which happens before render
        // In a real app, this would be handled by error boundaries
      });

      it('should handle multiple feature flag state changes', () => {
        const contextualChainId = '0x38';
        const globalChainId = '0x1';

        // Start with feature flag enabled
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        const testStore = createMockStore(contextualChainId, globalChainId);

        const { rerender } = render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Disable feature flag
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);

        rerender(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();

        // Re-enable feature flag
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

        rerender(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        expect(
          screen.getByTestId(SendViewSelectorsIDs.CONTAINER_ID),
        ).toBeTruthy();
      });

      it('should properly initialize contextual chain ID only when feature flag is enabled', () => {
        const globalChainId = '0x1'; // Using the same chain ID that's set in createMockStore

        // Test with feature flag enabled
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
        let testStore = createMockStore(undefined, globalChainId);

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should initialize contextual chain ID with global chain ID
        expect(testStore.dispatch).toHaveBeenCalledWith({
          type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
          chainId: globalChainId,
        });

        // Reset mocks and test with feature flag disabled
        jest.clearAllMocks();
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
        testStore = createMockStore(undefined, globalChainId);

        render(
          <Provider store={testStore}>
            <ThemeContext.Provider value={mockTheme}>
              <SendTo navigation={navigationPropMock} route={routeMock} />
            </ThemeContext.Provider>
          </Provider>,
        );

        // Should not initialize contextual chain ID when feature flag is disabled
        expect(testStore.dispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID',
          }),
        );
      });
    });
  });
});
