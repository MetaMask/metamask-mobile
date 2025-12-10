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
import { Reason } from '../../components/BlockaidBanner/BlockaidBanner.types';
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
        accountsByChainId: {
          '0x1': {
            '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': { balance: '0' },
          },
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
        keyrings: [
          {
            accounts: ['0x'],
            type: 'HD Key Tree',
            metadata: { id: '01JNG71B7GTWH0J1TSJY9891S0', name: '' },
          },
        ],
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
        reason: Reason.blurFarming,
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

jest.mock('../../../../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    networkImage: 1,
    networkName: 'Ethereum Network default RPC',
    networkNativeCurrency: 'ETH',
  })),
}));

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
    jest.requireActual(
      '../../../../../../util/test/accountsControllerTestUtils',
    );
  return {
    rejectPendingApproval: jest.fn(),
    context: {
      TokensController: {
        addToken: jest.fn(),
        ignoreTokens: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58'],
              metadata: { id: '01JNG71B7GTWH0J1TSJY9891S0', name: '' },
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
        getNonceLock: jest.fn().mockResolvedValue({
          nextNonce: 1,
          releaseLock: jest.fn(),
        }),
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
  ...jest.requireActual(
    '../../../../../../core/redux/slices/confirmationMetrics',
  ),
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
            accountsByChainId: {
              '0x1': {
                '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58': { balance: '0' },
              },
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

  it('should call addToken', async () => {
    const testState = merge({}, mockInitialState, {
      transaction: {
        securityAlertResponses: {
          1: {
            result_type: 'Malicious',
            reason: Reason.blurFarming,
            providerRequestsCount: {},
            chainId: '0x1',
          },
        },
        selectedAsset: {
          address: '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58',
          symbol: 'USDC',
          decimals: 6,
          image: 'https://example.com/usdc.png',
          name: 'USD Coin',
        },
        chainId: '0x1',
        transaction: {
          from: '0x15249D1a506AFC731Ee941d0D40Cf33FacD34E58',
          to: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
          value: '0x2',
        },
      },
    });
    render(Confirm, testState);

    expect(Engine.context.TokensController.addToken).toHaveBeenCalled();
  });
});
