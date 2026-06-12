import { createEip5792Middleware } from './createEip5792Middleware';

describe('createEip5792Middleware', () => {
  it('return instance of EIP-5792 Middleware', async () => {
    const middleware = createEip5792Middleware({
      getAccounts: jest.fn(),
      getCallsStatus: jest.fn(),
      getCapabilities: jest.fn(),
      processSendCalls: jest.fn(),
    });
    expect(middleware).toBeDefined();
  });
});
