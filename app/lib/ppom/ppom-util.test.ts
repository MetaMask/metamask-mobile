import PPOMUtil from './ppom-util';
import Engine from '../../core/Engine';

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
        providerConfig: {
          chainId: 1,
        },
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

describe('validateResponse', () => {
  it('should return null if preference securityAlertsEnabled is false', async () => {
    Engine.context.PreferencesController.state.securityAlertsEnabled = false;
    const result = await PPOMUtil.validateRequest(mockRequest);
    expect(result).toBeUndefined();
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
  });

  it('should return null user is not on mainnet', async () => {
    Engine.context.PreferencesController.state.securityAlertsEnabled = true;
    Engine.context.NetworkController.state.providerConfig.chainId = 2;
    const result = await PPOMUtil.validateRequest({
      ...mockRequest,
      method: 'eth_someMethod',
    });
    expect(result).toBeUndefined();
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
  });

  it('should return null if requested method is not allowed', async () => {
    Engine.context.NetworkController.state.providerConfig.chainId = 1;
    const result = await PPOMUtil.validateRequest({
      ...mockRequest,
      method: 'eth_someMethod',
    });
    expect(result).toBeUndefined();
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(0);
  });

  it('should invoke PPOMController usePPOM if securityAlertsEnabled is true', async () => {
    await PPOMUtil.validateRequest(mockRequest);
    expect(Engine.context.PPOMController.usePPOM).toBeCalledTimes(1);
  });
});
