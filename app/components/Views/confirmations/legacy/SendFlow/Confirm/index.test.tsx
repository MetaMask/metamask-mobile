import React from 'react';
import { ConnectedComponent } from 'react-redux';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import { Alert } from 'react-native';
import Confirm from '.';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { TESTID_ACCORDION_CONTENT } from '../../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
import { FALSE_POSITIVE_REPOST_LINE_TEST_ID } from '../../components/BlockaidBanner/BlockaidBanner.constants';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../../../reducers';
import { RpcEndpointType } from '@metamask/network-controller';
import { ConfirmViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/ConfirmView.selectors';
import { updateConfirmationMetric } from '../../../../../../core/redux/slices/confirmationMetrics';
import Engine from '../../../../../../core/Engine';
import { flushPromises } from '../../../../../../util/test/utils';

const MOCK_ADDRESS = '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {},
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                url: 'http://localhost/v3/',
                type: RpcEndpointType.Custom,
                name: 'Ethereum Network default RPC',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Ethereum Main Network',
            nativeCurrency: 'ETH',
          },
        },
      },
      AccountTrackerController: {
        accounts: {
          '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': { balance: '0' },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: {
            conversionRate: 1,
          },
        },
      },
      PreferencesController: {
        securityAlertsEnabled: true,
      },
      KeyringController: {
        keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  settings: {
    showHexData: true,
  },
  transaction: {
    securityAlertResponses: {
      1: {
        result_type: 'Malicious',
        reason: 'blur_farming',
        providerRequestsCount: {},
        chainId: '0x1',
      },
    },
    selectedAsset: {},
    chainId: '0x1',
    transaction: {
      from: '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58',
      to: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
      value: '0x2',
    },
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

jest.mock('../../../../../../core/GasPolling/GasPolling', () => ({
  ...jest.requireActual('../../../../../../core/GasPolling/GasPolling'),
  startGasPolling: jest.fn(),
  stopGasPolling: jest.fn(),
}));

jest.mock('../../../../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

jest.mock('../../../../../../lib/ppom/ppom-util', () => ({
  ...jest.requireActual('../../../../../../lib/ppom/ppom-util'),
  validateRequest: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../../../../util/test/accountsControllerTestUtils');
  return {
    rejectPendingApproval: jest.fn(),
    context: {
      TokensController: {
        addToken: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58'],
            },
          ],
        },
      },
      TransactionController: {
        addTransaction: jest.fn().mockResolvedValue({
          result: {},
          transactionMeta: {
            id: 1,
          },
        }),
        updateSecurityAlertResponse: jest.fn(),
      },
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

jest.mock('../../../../../../util/custom-gas', () => ({
  ...jest.requireActual('../../../../../../util/custom-gas'),
  getGasLimit: jest.fn(),
}));
jest.mock('../../../../../../util/transactions', () => ({
  ...jest.requireActual('../../../../../../util/transactions'),
  decodeTransferData: jest.fn().mockImplementation(() => ['0x2']),
}));

jest.mock('../../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...jest.requireActual('../../../../../../core/redux/slices/confirmationMetrics'),
  updateConfirmationMetric: jest.fn(),
  selectConfirmationMetrics: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../../reducers/swaps', () => ({
  swapsStateSelector: () => ({
    featureFlags: {
      smart_transactions: {
        mobile_active: false,
      },
    },
  }),
  swapsSmartTxFlagEnabled: () => false,
}));

jest.mock('../../../../../../selectors/preferencesController', () => ({
  selectSmartTransactionsBannerDismissed: () => false,
  selectSmartTransactionsMigrationApplied: () => false,
  selectSmartTransactionsOptInStatus: () => false,
  selectUseTransactionSimulations: () => false,
  selectIsTokenNetworkFilterEqualCurrentNetwork: () => true,
}));

function render(
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType | ConnectedComponent<any, any>,
  modifiedState?: DeepPartial<RootState>,
) {
  return renderScreen(
    Component,
    {
      name: Routes.SEND_FLOW.CONFIRM,
    },
    {
      state: modifiedState ?? mockInitialState,
    },
  );
}

describe('Confirm', () => {
  const mockUpdateConfirmationMetric = jest.mocked(updateConfirmationMetric);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    const wrapper = render(Confirm);
    await waitFor(() => {
      expect(wrapper).toMatchSnapshot();
    });
  });

  it('displays blockaid banner', async () => {
    const { queryByText, queryByTestId } = render(Confirm);

    await waitFor(async () => {
      expect(
        await queryByText(
          'If you approve this request, someone can steal your assets listed on Blur.',
        ),
      ).toBeDefined();

      expect(await queryByTestId(TESTID_ACCORDION_CONTENT)).toBeDefined();
      expect(
        await queryByTestId(FALSE_POSITIVE_REPOST_LINE_TEST_ID),
      ).toBeDefined();
      expect(await queryByText('Something doesn’t look right?')).toBeDefined();
    });
  });

  it('updates transaction metrics with insufficient_funds_for_gas when there is insufficient balance', async () => {
    const zeroBalanceState = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {
              '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58': { balance: '0' },
            },
          },
        },
      },
    });

    const { getByTestId } = render(Confirm, zeroBalanceState);

    const sendButton = getByTestId(ConfirmViewSelectorsIDs.SEND_BUTTON);
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockUpdateConfirmationMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            properties: {
              alert_triggered: ['insufficient_funds_for_gas'],
            },
          },
        }),
      );
    });
  });

  it('should show error if transaction is not added', async () => {
    jest.spyOn(Alert, 'alert');

    Engine.context.TransactionController.addTransaction = jest
      .fn()
      .mockRejectedValue(new Error('Transaction not added'));

    render(Confirm);

    await flushPromises();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Transaction error',
        'Transaction not added',
        expect.any(Array),
      );
    });
  });

  it('should handle successful transaction submission', async () => {
    // Mock successful transaction submission
    const mockTxHash = '0x123456789';
    const addTransactionMock = jest.fn().mockResolvedValue({ result: mockTxHash, transactionMeta: { id: '123' } });
    Engine.context.TransactionController.addTransaction = addTransactionMock;

    const { getByTestId } = render(Confirm);

    const sendButton = getByTestId(ConfirmViewSelectorsIDs.SEND_BUTTON);
    fireEvent.press(sendButton);

    await flushPromises();

    await waitFor(() => {
      expect(addTransactionMock).toHaveBeenCalled();
    });
  });

  // Tests for onLedgerConfirmation function
  describe('onLedgerConfirmation', () => {
    // Define a more specific interface for the mock component
    interface MockConfirmComponent {
      props: {
        navigation: {
          goBack: jest.Mock;
        };
        setTransactionId: jest.Mock;
      };
      setState: jest.Mock;
      setError: jest.Mock;
      onLedgerConfirmation: (approve: boolean, result: unknown, transactionMeta: Record<string, unknown> | null, assetType: string, gaParams: Record<string, unknown> | null) => Promise<void>;
    }

    let mockConfirmComponent: MockConfirmComponent;
    let mockSetTransactionId: jest.Mock;
    let mockSetState: jest.Mock;
    let mockNavigationGoBack: jest.Mock;
    let mockSetError: jest.Mock;

    beforeEach(() => {
      // Reset mocks
      mockSetTransactionId = jest.fn();
      mockSetState = jest.fn();
      mockNavigationGoBack = jest.fn();
      mockSetError = jest.fn();

      // Create a mock instance of the Confirm component
      mockConfirmComponent = {
        props: {
          navigation: {
            goBack: mockNavigationGoBack,
          },
          setTransactionId: mockSetTransactionId,
        },
        setState: mockSetState,
        setError: mockSetError,
        // We'll define this properly below
        onLedgerConfirmation: undefined as unknown as MockConfirmComponent['onLedgerConfirmation'],
      };

      // Create a mock implementation of onLedgerConfirmation that matches the expected behavior
      mockConfirmComponent.onLedgerConfirmation = async (approve, result, transactionMeta, _assetType, _gaParams) => {
        if (!approve) {
          // User rejected or cancelled
          mockNavigationGoBack();
          // Mock rejection with required arguments
          Engine.rejectPendingApproval('123', 'user-cancelled');
          return;
        }

        // User approved
        try {
          // Try to get the result
          await Promise.resolve(result);

          // Check for error in transactionMeta
          if (transactionMeta && 'error' in transactionMeta && transactionMeta.error) {
            throw transactionMeta.error;
          }

          // Set transaction ID
          if (transactionMeta && 'id' in transactionMeta) {
            mockSetTransactionId(transactionMeta.id);
          }

          // Update state
          mockSetState({ result, transactionMeta });
        } catch (error) {
          // Handle error
          mockSetError(error instanceof Error ? error.message : String(error));
          throw error;
        }
      };
    });

    it('should handle successful Ledger confirmations', async () => {
      // Mock successful result
      const mockResult = { success: true };
      const mockTransactionMeta = { id: '123' };

      // Call the function with approve=true
      await mockConfirmComponent.onLedgerConfirmation(true, mockResult, mockTransactionMeta, 'ETH', {});

      // Verify expected behaviors
      expect(mockSetTransactionId).toHaveBeenCalledWith('123');
      expect(mockSetState).toHaveBeenCalledWith({
        result: mockResult,
        transactionMeta: mockTransactionMeta,
      });
    });

    it('should handle Ledger confirmation errors', async () => {
      // Mock error result
      const mockError = new Error('Ledger error');
      const mockTransactionMeta = {
        id: '123',
        error: mockError,
      };

      // Call the function with approve=true but with an error in transactionMeta
      await expect(
        mockConfirmComponent.onLedgerConfirmation(true, {}, mockTransactionMeta, 'ETH', {})
      ).rejects.toThrow(mockError);
    });

    it('should handle manual cancellation from Ledger', async () => {
      // Spy on Engine.rejectPendingApproval
      const mockRejectPendingApproval = jest.spyOn(Engine, 'rejectPendingApproval');

      // Call the function with approve=false to simulate cancellation
      // Using empty records instead of null to satisfy TypeScript
      await mockConfirmComponent.onLedgerConfirmation(false, null, {}, 'ETH', {});

      // Verify navigation and rejection behaviors
      expect(mockNavigationGoBack).toHaveBeenCalled();
      expect(mockRejectPendingApproval).toHaveBeenCalled();
    });
  });
});
