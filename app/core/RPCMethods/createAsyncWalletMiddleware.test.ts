import { createAsyncWalletMiddleware } from './createAsyncWalletMiddleware';

describe('createAsyncWalletMiddleware', () => {
  it('return instance of Wallet Middleware', async () => {
    const middleware = createAsyncWalletMiddleware();
    expect(middleware).toBeDefined();
  });
});
