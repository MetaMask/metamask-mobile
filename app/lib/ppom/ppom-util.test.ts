import {
  normalizeTransactionParams,
  TransactionMeta,
} from '@metamask/transaction-controller';
import * as SecurityAlertsActions from '../../reducers/security-alerts'; // eslint-disable-line import/no-namespace
import Engine from '../../core/Engine';
import PPOMUtil, {
  METHOD_SIGN_TYPED_DATA_V3,
  METHOD_SIGN_TYPED_DATA_V4,
} from './ppom-util';
// eslint-disable-next-line import/no-namespace
import * as securityAlertAPI from './security-alerts-api';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import { Hex } from '@metamask/utils';
import {
  NetworkClientType,
  RpcEndpointType,
} from '@metamask/network-controller';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import {
  Reason,
  ResultType,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';
import Logger from '../../util/Logger';

const CHAIN_ID_REQUEST_MOCK = '0x1' as Hex;
const CHAIN_ID_TRANSACTION_MOCK = '0x2' as Hex;
const CHAIN_ID_NETWORK_CLIENT_MOCK = '0x3' as Hex;
const CHAIN_ID_GLOBAL_MOCK = '0x3' as Hex;
const NETWORK_CLIENT_ID_REQUEST_MOCK = 'testNetwork1';
const NETWORK_CLIENT_ID_TRANSACTION_MOCK = 'testNetwork2';
const NETWORK_CLIENT_ID_GLOBAL_MOCK = 'testNetwork3';
const TRANSACTION_ID_MOCK = '111-222-333';

const SIGN_TYPED_DATA_PARAMS_MOCK_1 = '0x123';
const SIGN_TYPED_DATA_PARAMS_MOCK_2 =
  '{"primaryType":"Permit","domain":{},"types":{}}';

jest.mock('./security-alerts-api');
jest.mock('../../util/blockaid');

jest.mock('../../util/transaction-controller', () => ({
  __esModule: true,
  updateSecurityAlertResponse: jest.fn(),
  updateTransaction: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    PreferencesController: {
      state: {
        securityAlertsEnabled: true,
      },
    },
    AccountsController: {
      state: {
        internalAccounts: { accounts: [] },
      },
      listAccounts: jest.fn().mockReturnValue([]),
    },
    TransactionController: {
      state: {
        transactions: [],
      },
    },
  },
  backgroundState: {
    NetworkController: {
      selectedNetworkClientId: 'mainnet',
      networksMetadata: {},
      networkConfigurations: {
        mainnet: {
          id: 'mainnet',
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Sepolia network',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      },
    },
  },
}));

const MockEngine = jest.mocked(Engine);

jest.mock('@metamask/transaction-controller', () => ({
  ...jest.requireActual('@metamask/transaction-controller'),
  normalizeTransactionParams: jest.fn(),
}));

const mockRequest = {
  id: 4247010338,
  jsonrpc: '2.0',
  method: 'eth_sendTransaction',
  networkClientId: NETWORK_CLIENT_ID_REQUEST_MOCK,
  origin: 'metamask.github.io',
  params: [
    {
      from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
      gasLimit: '0x5028',
      maxFeePerGas: '0x2540be400',
      maxPriorityFeePerGas: '0x3b9aca00',
      to: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
      value: '0x0',
    },
  ],
  toNative: true,
};

/** Disclaimer: the gas and gasPrice are derived from the transactionMeta.txParams */
const mockTransactionNormalized = {
  ...mockRequest,
  params: [
    {
      from: '0x8eeee1781fd885ff5ddef7789486676961873d12',
      to: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
      value: '0x0',
      gas: undefined,
      gasPrice: undefined,
    },
  ],
};

const mockTransactionNormalizedWithGasAndGasPrice = {
  ...mockTransactionNormalized,
  params: [
    {
      ...mockTransactionNormalized.params[0],
      gas: '0x5028',
      gasPrice: '0x2540be400',
    },
  ],
};

const mockTransactionMeta = {
  id: TRANSACTION_ID_MOCK,
  networkClientId: NETWORK_CLIENT_ID_TRANSACTION_MOCK,
  txParams: { gas: '0x5028', gasPrice: '0x2540be400' },
} as TransactionMeta;

const mockSignatureRequest = {
  method: 'personal_sign',
  params: [
    '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
    '0x8eeee1781fd885ff5ddef7789486676961873d12',
    'Example password',
  ],
  jsonrpc: '2.0',
  id: 2097534692,
  toNative: true,
  origin: 'metamask.github.io',
};

const mockSecurityAlertResponse = {
  chainId: CHAIN_ID_REQUEST_MOCK,
  providerRequestsCount: {
    eth_call: 2,
    eth_getCode: 2,
  },
  reason: undefined as unknown as Reason,
  req: mockRequest,
  result_type: ResultType.Benign,
};

jest.useFakeTimers();

describe('PPOM Utils', () => {
  const validateWithSecurityAlertsAPIMock = jest.mocked(
    securityAlertAPI.validateWithSecurityAlertsAPI,
  );

  const mockIsBlockaidFeatureEnabled = jest.mocked(isBlockaidFeatureEnabled);

  const normalizeTransactionParamsMock = jest.mocked(
    normalizeTransactionParams,
  );

  beforeEach(() => {
    MockEngine.context.PreferencesController.state.securityAlertsEnabled = true;

    MockEngine.context.NetworkController = {
      getNetworkClientById: (networkClientId) => ({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: {
            [NETWORK_CLIENT_ID_GLOBAL_MOCK]: CHAIN_ID_GLOBAL_MOCK,
            [NETWORK_CLIENT_ID_REQUEST_MOCK]: CHAIN_ID_REQUEST_MOCK,
            [NETWORK_CLIENT_ID_TRANSACTION_MOCK]: CHAIN_ID_NETWORK_CLIENT_MOCK,
          }[networkClientId] as Hex,
          ticker: 'ETH',
          type: NetworkClientType.Custom,
        },
      }),
      state: {
        networkConfigurationsByChainId: {
          [NETWORKS_CHAIN_ID.MAINNET]: {
            blockExplorerUrls: ['http://etherscan.com'],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Mainnet',
            nativeCurrency: 'ETH',
            defaultBlockExplorerUrlIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: RpcEndpointType.Custom,
                name: 'ethereum',
                url: 'https://mainnet.infura.io/v3',
                failoverUrls: undefined,
              },
            ],
            lastUpdatedAt: Date.now(),
          },
        },
        networksMetadata: {},
        selectedNetworkClientId: NETWORK_CLIENT_ID_GLOBAL_MOCK,
      },
    };

    normalizeTransactionParamsMock.mockImplementation((params) => params);
    mockIsBlockaidFeatureEnabled.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should not validate if preference securityAlertsEnabled is false', async () => {
      mockIsBlockaidFeatureEnabled.mockResolvedValue(false);
      const spyTransactionAction = jest.spyOn(
        SecurityAlertsActions,
        'setSecurityAlertResponse',
      );
      MockEngine.context.PreferencesController.state.securityAlertsEnabled = false;
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(0);
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate if request is send to users own account ', async () => {
      const spyTransactionAction = jest.spyOn(
        SecurityAlertsActions,
        'setSecurityAlertResponse',
      );
      MockEngine.context.AccountsController.listAccounts = jest
        .fn()
        .mockReturnValue([
          {
            address: '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb',
          },
        ]);
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(0);
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
      MockEngine.context.AccountsController.listAccounts = jest
        .fn()
        .mockReturnValue([]);
    });

    it('should not validate if requested method is not allowed', async () => {
      const spyTransactionAction = jest.spyOn(
        SecurityAlertsActions,
        'setSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(
        {
          ...mockRequest,
          method: 'eth_someMethod',
        },
        { transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta },
      );
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(0);
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate transaction and not dispatch response if method type is eth_sendTransaction and transactionid and securityAlertId is not defined', async () => {
      const spyTransactionAction = jest.spyOn(
        SecurityAlertsActions,
        'setSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(0);
      // When transactionId is undefined, updateSecurityResultForTransaction returns early without dispatching
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should update transaction with validation result', async () => {
      const spy = jest.spyOn(SecurityAlertsActions, 'setSecurityAlertResponse');

      validateWithSecurityAlertsAPIMock.mockResolvedValue(
        mockSecurityAlertResponse,
      );

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(2, TRANSACTION_ID_MOCK, {
        ...mockSecurityAlertResponse,
        source: SecurityAlertSource.API,
      });
    });

    it('should update transaction with validation result if only securityAlertId is provided', async () => {
      const mockSecurityAlertId = 'abc123';
      Engine.context.TransactionController.state.transactions = [
        {
          securityAlertResponse: { securityAlertId: mockSecurityAlertId },
          id: 'transactionId',
        } as unknown as TransactionMeta,
      ];
      const spy = jest.spyOn(SecurityAlertsActions, 'setSecurityAlertResponse');
      await PPOMUtil.validateRequest(mockRequest, {
        securityAlertId: mockSecurityAlertId,
      });
      jest.advanceTimersByTime(10000);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should update transaction with validation result if transactionId is not found for securityAlertId provided', async () => {
      const mockSecurityAlertId = 'abc123';
      Engine.context.TransactionController.state.transactions = [
        {
          securityAlertResponse: { securityAlertId: '123' },
          id: 'transactionId',
        } as unknown as TransactionMeta,
      ];
      const spy = jest.spyOn(SecurityAlertsActions, 'setSecurityAlertResponse');
      await PPOMUtil.validateRequest(mockRequest, {
        securityAlertId: mockSecurityAlertId,
      });
      jest.advanceTimersByTime(10000);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should update signature requests with validation result', async () => {
      const spy = jest.spyOn(SecurityAlertsActions, 'setSecurityAlertResponse');
      await PPOMUtil.validateRequest(mockSignatureRequest);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('logs error if normalization fails', async () => {
      const error = new Error('Test Error');
      normalizeTransactionParamsMock.mockImplementation(() => {
        throw error;
      });

      const spyLogger = jest.spyOn(Logger, 'log');

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });

      expect(spyLogger).toHaveBeenCalledTimes(1);
      expect(spyLogger).toHaveBeenCalledWith(
        `Error validating JSON RPC using PPOM: ${error}`,
      );
    });

    it('normalizes transaction request origin before validation', async () => {
      await PPOMUtil.validateRequest(
        {
          ...mockRequest,
          origin: 'wc::metamask.github.io',
        },
        { transactionMeta: mockTransactionMeta },
      );

      expect(normalizeTransactionParamsMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        expect.any(String),
        mockTransactionNormalizedWithGasAndGasPrice,
      );
    });

    it('uses chain ID from transaction if provided', async () => {
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: {
          id: TRANSACTION_ID_MOCK,
          chainId: CHAIN_ID_TRANSACTION_MOCK,
          networkClientId: NETWORK_CLIENT_ID_TRANSACTION_MOCK,
        } as TransactionMeta,
      });

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_TRANSACTION_MOCK,
        expect.any(Object),
      );
    });

    it('uses chain ID from request network client ID', async () => {
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: {
          id: TRANSACTION_ID_MOCK,
          networkClientId: NETWORK_CLIENT_ID_TRANSACTION_MOCK,
        } as TransactionMeta,
      });

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_NETWORK_CLIENT_MOCK,
        expect.any(Object),
      );
    });

    it('uses chain ID from global network as fallback', async () => {
      await PPOMUtil.validateRequest({
        ...mockRequest,
        method: METHOD_SIGN_TYPED_DATA_V3,
        networkClientId: undefined,
      });

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_GLOBAL_MOCK,
        expect.any(Object),
      );
    });

    it('sets security alerts response to failed when security alerts API throws', async () => {
      const spy = jest.spyOn(SecurityAlertsActions, 'setSecurityAlertResponse');

      const spyLogger = jest.spyOn(Logger, 'log');

      const error = new Error('Test Error');
      validateWithSecurityAlertsAPIMock.mockRejectedValue(error);

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: mockTransactionMeta,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(TRANSACTION_ID_MOCK, {
        chainId: CHAIN_ID_NETWORK_CLIENT_MOCK,
        req: mockRequest,
        result_type: ResultType.Failed,
        reason: Reason.failed,
        description: 'Validating the confirmation failed by throwing error.',
        source: SecurityAlertSource.API,
      });

      expect(spyLogger).toHaveBeenCalledTimes(1);
      expect(spyLogger).toHaveBeenCalledWith(
        `Error validating request with security alerts API: ${error}`,
      );
    });

    it.each([METHOD_SIGN_TYPED_DATA_V3, METHOD_SIGN_TYPED_DATA_V4])(
      'sanitizes request params if method is %s',
      async (method: string) => {
        const firstTwoParams = [
          SIGN_TYPED_DATA_PARAMS_MOCK_1,
          SIGN_TYPED_DATA_PARAMS_MOCK_2,
        ];

        const unwantedParams = [{}, undefined, 1, null];

        const params = [...firstTwoParams, ...unwantedParams];

        const request = {
          ...mockRequest,
          method,
          params,
        };
        await PPOMUtil.validateRequest(request, {
          transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
        });

        expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
        expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
          CHAIN_ID_REQUEST_MOCK,
          {
            ...request,
            params: firstTwoParams,
          },
        );
      },
    );
  });

  describe('clearSignatureSecurityAlertResponse', () => {
    it('dispatches clearSecurityAlertResponse action with signature ID', async () => {
      const spy = jest.spyOn(
        SecurityAlertsActions,
        'clearSecurityAlertResponse',
      );
      const mockSignatureId = 'test-signature-id';
      PPOMUtil.clearSignatureSecurityAlertResponse(mockSignatureId);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockSignatureId);
    });
  });
});
