import { normalizeTransactionParams } from '@metamask/transaction-controller';
import * as SignatureRequestActions from '../../actions/signatureRequest'; // eslint-disable-line import/no-namespace
import * as TransactionActions from '../../actions/transaction'; // eslint-disable-line import/no-namespace
import Engine from '../../core/Engine';
import PPOMUtil from './ppom-util';

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
    NetworkController: {
      state: {
        providerConfig: { chainId: '0x1' },
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

describe('validateResponse', () => {
  const normalizeTransactionParamsMock = jest.mocked(
    normalizeTransactionParams,
  );

  beforeEach(() => {
    MockEngine.context.PreferencesController.state.securityAlertsEnabled = true;
    MockEngine.context.NetworkController.state.providerConfig.chainId = '0x1';

    normalizeTransactionParamsMock.mockImplementation((params) => params);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not validate if preference securityAlertsEnabled is false', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    MockEngine.context.PreferencesController.state.securityAlertsEnabled =
      false;
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(MockEngine.context.PPOMController?.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
  });

  it('should not validate user if on a non supporting blockaid network', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    MockEngine.context.NetworkController.state.providerConfig.chainId = '0xfa';
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(MockEngine.context.PPOMController?.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
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
      '123',
    );
    expect(MockEngine.context.PPOMController?.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
  });

  it('should not validate transaction and update response as failed if method type is eth_sendTransaction and transactionid is not defined', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    await PPOMUtil.validateRequest(mockRequest);
    expect(MockEngine.context.PPOMController?.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(1);
  });

  it('should invoke PPOMController usePPOM if securityAlertsEnabled is true', async () => {
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(MockEngine.context.PPOMController?.usePPOM).toBeCalledTimes(1);
  });

  it('should update transaction with validation result', async () => {
    const spy = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(spy).toBeCalledTimes(2);
  });

  it('should update signature requests with validation result', async () => {
    const spy = jest.spyOn(SignatureRequestActions, 'default');
    await PPOMUtil.validateRequest(mockSignatureRequest);
    expect(spy).toBeCalledTimes(2);
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (callback: any) => callback(ppomMock),
    );

    normalizeTransactionParamsMock.mockReturnValue(
      normalizedTransactionParamsMock,
    );

    await PPOMUtil.validateRequest(mockRequest, '123');

    expect(normalizeTransactionParamsMock).toBeCalledTimes(1);
    expect(normalizeTransactionParamsMock).toBeCalledWith(
      mockRequest.params[0],
    );

    expect(validateMock).toBeCalledTimes(1);
    expect(validateMock).toBeCalledWith({
      ...mockRequest,
      params: [normalizedTransactionParamsMock],
    });
  });

  it('normalizes transaction request origin before validation', async () => {
    const validateMock = jest.fn();

    const ppomMock = {
      validateJsonRpc: validateMock,
    };

    MockEngine.context.PPOMController?.usePPOM.mockImplementation(
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (callback: any) => callback(ppomMock),
    );

    await PPOMUtil.validateRequest(
      {
        ...mockRequest,
        origin: 'wc::metamask.github.io',
      },
      '123',
    );

    expect(normalizeTransactionParamsMock).toBeCalledTimes(1);
    expect(normalizeTransactionParamsMock).toBeCalledWith(
      mockRequest.params[0],
    );

    expect(validateMock).toBeCalledTimes(1);
    expect(validateMock).toBeCalledWith({
      ...mockRequest,
    });
  });
});
