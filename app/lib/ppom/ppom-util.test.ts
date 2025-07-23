import {
  normalizeTransactionParams,
  TransactionMeta,
} from '@metamask/transaction-controller';
import * as SignatureRequestActions from '../../actions/signatureRequest'; // eslint-disable-line import/no-namespace
import * as TransactionActions from '../../actions/transaction'; // eslint-disable-line import/no-namespace
import * as NetworkControllerSelectors from '../../selectors/networkController'; // eslint-disable-line import/no-namespace
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
} from '../../components/Views/confirmations/legacy/components/BlockaidBanner/BlockaidBanner.types';
import Logger from '../../util/Logger';

const CHAIN_ID_REQUEST_MOCK = '0x1' as Hex;
const CHAIN_ID_TRANSACTION_MOCK = '0x2' as Hex;
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
    PPOMController: {
      usePPOM: jest.fn(),
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

jest.useFakeTimers();

describe('PPOM Utils', () => {
  const validateWithSecurityAlertsAPIMock = jest.mocked(
    securityAlertAPI.validateWithSecurityAlertsAPI,
  );

  const isSecurityAlertsEnabledMock = jest.mocked(
    securityAlertAPI.isSecurityAlertsAPIEnabled,
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
            [NETWORK_CLIENT_ID_TRANSACTION_MOCK]: CHAIN_ID_TRANSACTION_MOCK,
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
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      MockEngine.context.PreferencesController.state.securityAlertsEnabled =
        false;
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate if request is send to users own account ', async () => {
      const spyTransactionAction = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
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
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
      MockEngine.context.AccountsController.listAccounts = jest
        .fn()
        .mockReturnValue([]);
    });

    it('should not validate user if on a non supporting blockaid network', async () => {
      mockIsBlockaidFeatureEnabled.mockResolvedValue(false);
      const spyTransactionAction = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      jest
        .spyOn(NetworkControllerSelectors, 'selectChainId')
        .mockReturnValue('0xfa');
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate if requested method is not allowed', async () => {
      const spyTransactionAction = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      MockEngine.context.PreferencesController.state.securityAlertsEnabled =
        false;
      await PPOMUtil.validateRequest(
        {
          ...mockRequest,
          method: 'eth_someMethod',
        },
        { transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta },
      );
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate transaction and update response as failed if method type is eth_sendTransaction and transactionid, securityAlertId is not defined', async () => {
      const spyTransactionAction = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest);
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(1);
    });

    it('should invoke PPOMController usePPOM if securityAlertsEnabled is true', async () => {
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should update transaction with validation result', async () => {
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should update transaction with validation result if only securityAlertId is provided', async () => {
      const mockSecurityAlertId = 'abc123';
      Engine.context.TransactionController.state.transactions = [
        {
          securityAlertResponse: { securityAlertId: mockSecurityAlertId },
          id: 'transactionId',
        } as unknown as TransactionMeta,
      ];
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
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
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest, {
        securityAlertId: mockSecurityAlertId,
      });
      jest.advanceTimersByTime(10000);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should update signature requests with validation result', async () => {
      const spy = jest.spyOn(SignatureRequestActions, 'default');
      await PPOMUtil.validateRequest(mockSignatureRequest);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('normalizes transaction requests before validation', async () => {
      const validateMock = jest.fn();

      const ppomMock = {
        validateJsonRpc: validateMock,
      };

      MockEngine.context.PPOMController?.usePPOM.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback: any) => callback(ppomMock),
      );

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });

      expect(normalizeTransactionParamsMock).toHaveBeenCalledTimes(1);
      expect(normalizeTransactionParamsMock).toHaveBeenCalledWith(
        mockTransactionNormalized.params[0],
      );

      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith({
        ...mockRequest,
        params: [mockTransactionNormalized.params[0]],
      });
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
      const validateMock = jest.fn();

      const ppomMock = {
        validateJsonRpc: validateMock,
      };

      MockEngine.context.PPOMController?.usePPOM.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback: any) => callback(ppomMock),
      );

      await PPOMUtil.validateRequest(
        {
          ...mockRequest,
          origin: 'wc::metamask.github.io',
        },
        { transactionMeta: mockTransactionMeta },
      );

      expect(normalizeTransactionParamsMock).toHaveBeenCalledTimes(1);
      expect(normalizeTransactionParamsMock).toHaveBeenCalledWith(
        mockTransactionNormalizedWithGasAndGasPrice.params[0],
      );

      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith(
        mockTransactionNormalizedWithGasAndGasPrice,
      );
    });

    it('uses security alerts API if enabled', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });

      expect(MockEngine.context.PPOMController?.usePPOM).not.toHaveBeenCalled();

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        expect.any(String),
        mockTransactionNormalized,
      );
    });

    it('uses chain ID from transaction if provided', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: {
          id: TRANSACTION_ID_MOCK,
          networkClientId: NETWORK_CLIENT_ID_TRANSACTION_MOCK,
        } as TransactionMeta,
      });

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_TRANSACTION_MOCK,
        expect.any(Object),
      );
    });

    it('uses chain ID from request if provided', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);

      await PPOMUtil.validateRequest({
        ...mockRequest,
        method: METHOD_SIGN_TYPED_DATA_V3,
      });

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_REQUEST_MOCK,
        expect.any(Object),
      );
    });

    it('uses chain ID from global network as fallback', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);

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

    it('uses controller if security alerts API throws', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);

      validateWithSecurityAlertsAPIMock.mockRejectedValue(
        new Error('Test Error'),
      );

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: mockTransactionMeta,
      });

      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        1,
      );

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_TRANSACTION_MOCK,
        mockTransactionNormalizedWithGasAndGasPrice,
      );
    });

    it('validates correctly if security alerts API throws', async () => {
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: { id: TRANSACTION_ID_MOCK } as TransactionMeta,
      });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('sets security alerts response to failed when security alerts API and controller PPOM throws', async () => {
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );

      const validateMock = new Error('Test Error');

      const ppomMock = {
        validateJsonRpc: validateMock,
      };

      MockEngine.context.PPOMController?.usePPOM.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback: any) => callback(ppomMock),
      );

      await PPOMUtil.validateRequest(mockRequest, {
        transactionMeta: mockTransactionMeta,
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(TRANSACTION_ID_MOCK, {
        chainId: CHAIN_ID_TRANSACTION_MOCK,
        req: mockRequest,
        result_type: ResultType.Failed,
        reason: Reason.failed,
        description: 'Validating the confirmation failed by throwing error.',
        source: SecurityAlertSource.Local,
      });
    });

    it.each([METHOD_SIGN_TYPED_DATA_V3, METHOD_SIGN_TYPED_DATA_V4])(
      'sanitizes request params if method is %s',
      async (method: string) => {
        isSecurityAlertsEnabledMock.mockReturnValue(true);

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
    it('set call action to set securityAlertResponse for signature in redux state to undefined', async () => {
      const spy = jest.spyOn(SignatureRequestActions, 'default');
      PPOMUtil.clearSignatureSecurityAlertResponse();
      expect(spy).toHaveBeenCalledTimes(1);
      // function call with no arguments
      expect(spy).toHaveBeenCalledWith();
    });
  });
});
