import PPOMUtil from './ppom-util';
import Engine from '../../core/Engine';
import * as TransactionActions from '../../actions/transaction'; // eslint-disable-line import/no-namespace
import * as SignatureRequestActions from '../../actions/signatureRequest'; // eslint-disable-line import/no-namespace

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
    TransactionController: {
      updateTransaction: jest.fn(),
      updateSecurityAlertResponse: jest.fn(),
    },
    NetworkController: {
      state: {
        providerConfig: { chainId: '1' },
      },
    },
  },
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
  beforeEach(() => {
    Engine.context.PreferencesController.state.securityAlertsEnabled = true;
    Engine.context.NetworkController.state.providerConfig.chainId = '1';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not validate if preference securityAlertsEnabled is false', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    Engine.context.PreferencesController.state.securityAlertsEnabled = false;
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
  });

  it('should not validate user is not on mainnet', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    Engine.context.NetworkController.state.providerConfig.chainId = '5';
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
  });

  it('should not validate if requested method is not allowed', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    Engine.context.PreferencesController.state.securityAlertsEnabled = false;
    await PPOMUtil.validateRequest(
      {
        ...mockRequest,
        method: 'eth_someMethod',
      },
      '123',
    );
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(0);
  });

  it('should not validate transaction and update response as failed if method type is eth_sendTransaction and transactionid is not defined', async () => {
    const spyTransactionAction = jest.spyOn(
      TransactionActions,
      'setTransactionSecurityAlertResponse',
    );
    const spy = jest.spyOn(Engine.context.PPOMController, 'usePPOM');
    await PPOMUtil.validateRequest(mockRequest);
    expect(spy).toBeCalledTimes(0);
    expect(spyTransactionAction).toBeCalledTimes(1);
  });

  it('should invoke PPOMController usePPOM if securityAlertsEnabled is true', async () => {
    await PPOMUtil.validateRequest(mockRequest, '123');
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(1);
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
});
