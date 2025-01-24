import { normalizeTransactionParams } from '@metamask/transaction-controller';
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
} from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';
import Logger from '../../util/Logger';

const CHAIN_ID_MOCK = '0x1';

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

describe('PPOM Utils', () => {
  const validateWithSecurityAlertsAPIMock = jest.mocked(
    securityAlertAPI.validateWithSecurityAlertsAPI,
  );

  const isSecurityAlertsEnabledMock = jest.mocked(
    securityAlertAPI.isSecurityAlertsAPIEnabled,
  );

  const mockIsBlockaidFeatureEnabled = jest.mocked(isBlockaidFeatureEnabled);

  const getSupportedChainIdsMock = jest.spyOn(
    securityAlertAPI,
    'getSecurityAlertsAPISupportedChainIds',
  );

  const normalizeTransactionParamsMock = jest.mocked(
    normalizeTransactionParams,
  );

  beforeEach(() => {
    MockEngine.context.PreferencesController.state.securityAlertsEnabled = true;

    MockEngine.context.NetworkController = {
      getNetworkClientById: () => ({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: CHAIN_ID_MOCK as Hex,
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
              },
            ],
            lastUpdatedAt: Date.now(),
          },
        },
        networksMetadata: {},
        selectedNetworkClientId: 'mainnet',
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
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
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
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
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
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
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
        CHAIN_ID_MOCK,
      );
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        0,
      );
      expect(spyTransactionAction).toHaveBeenCalledTimes(0);
    });

    it('should not validate transaction and update response as failed if method type is eth_sendTransaction and transactionid is not defined', async () => {
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
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should update transaction with validation result', async () => {
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should update signature requests with validation result', async () => {
      const spy = jest.spyOn(SignatureRequestActions, 'default');
      await PPOMUtil.validateRequest(mockSignatureRequest);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('normalizes transaction requests before validation', async () => {
      const normalizedTransactionParamsMock = {
        ...mockRequest.params[0],
        data: '0xabcd',
      };

      const validateMock = jest.fn();

      const ppomMock = {
        validateJsonRpc: validateMock,
      };

      MockEngine.context.PPOMController?.usePPOM.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (callback: any) => callback(ppomMock),
      );

      normalizeTransactionParamsMock.mockReturnValue(
        normalizedTransactionParamsMock,
      );

      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);

      expect(normalizeTransactionParamsMock).toHaveBeenCalledTimes(1);
      expect(normalizeTransactionParamsMock).toHaveBeenCalledWith(
        mockRequest.params[0],
      );

      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith({
        ...mockRequest,
        params: [normalizedTransactionParamsMock],
      });
    });

    it('logs error if normalization fails', async () => {
      const error = new Error('Test Error');
      normalizeTransactionParamsMock.mockImplementation(() => {
        throw error;
      });

      const spyLogger = jest.spyOn(Logger, 'log');

      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);

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
        CHAIN_ID_MOCK,
      );

      expect(normalizeTransactionParamsMock).toHaveBeenCalledTimes(1);
      expect(normalizeTransactionParamsMock).toHaveBeenCalledWith(
        mockRequest.params[0],
      );

      expect(validateMock).toHaveBeenCalledTimes(1);
      expect(validateMock).toHaveBeenCalledWith({
        ...mockRequest,
      });
    });

    it('uses security alerts API if enabled', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);
      getSupportedChainIdsMock.mockResolvedValue([CHAIN_ID_MOCK]);

      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);

      expect(MockEngine.context.PPOMController?.usePPOM).not.toHaveBeenCalled();

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_MOCK,
        mockRequest,
      );
    });

    it('uses controller if security alerts API throws', async () => {
      isSecurityAlertsEnabledMock.mockReturnValue(true);
      getSupportedChainIdsMock.mockResolvedValue([CHAIN_ID_MOCK]);

      validateWithSecurityAlertsAPIMock.mockRejectedValue(
        new Error('Test Error'),
      );

      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);

      expect(MockEngine.context.PPOMController?.usePPOM).toHaveBeenCalledTimes(
        1,
      );

      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
      expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
        CHAIN_ID_MOCK,
        mockRequest,
      );
    });

    it('validates correctly if security alerts API throws', async () => {
      const spy = jest.spyOn(
        TransactionActions,
        'setTransactionSecurityAlertResponse',
      );
      jest
        .spyOn(securityAlertAPI, 'getSecurityAlertsAPISupportedChainIds')
        .mockRejectedValue(new Error('Test Error'));
      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
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

      await PPOMUtil.validateRequest(mockRequest, CHAIN_ID_MOCK);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(CHAIN_ID_MOCK, {
        chainId: CHAIN_ID_MOCK,
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
        getSupportedChainIdsMock.mockResolvedValue([CHAIN_ID_MOCK]);

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
        await PPOMUtil.validateRequest(request, CHAIN_ID_MOCK);

        expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledTimes(1);
        expect(validateWithSecurityAlertsAPIMock).toHaveBeenCalledWith(
          CHAIN_ID_MOCK,
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
