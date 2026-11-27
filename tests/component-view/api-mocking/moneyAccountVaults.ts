import Engine from '../../../app/core/Engine';

const messengerCall = (
  Engine.controllerMessenger as unknown as { call: jest.Mock }
).call;
// Captured at import time so a spec's beforeEach `mockReset` still falls back
// to the Engine mock's default implementation.
const pristineImplementation = messengerCall.getMockImplementation();

export function setupMoneyAccountVaultApiMock({
  valuationReply,
}: {
  valuationReply: () => Promise<unknown>;
}): void {
  messengerCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVaultShareValuations') {
      return valuationReply();
    }
    if (action === 'MoneyAccountApiDataService:fetchVaultRate') {
      return Promise.resolve({ rate: '1.017488' });
    }
    return (
      pristineImplementation?.(action, ...args) ?? Promise.resolve(undefined)
    );
  });
}
