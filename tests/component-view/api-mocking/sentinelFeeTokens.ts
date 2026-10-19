import Engine from '../../../app/core/Engine';
import type { SentinelFeeTokensByChain } from '../../../app/components/UI/Bridge/api/sentinelFeeTokens';

type MessengerCall = (action: string, ...args: unknown[]) => unknown;

interface MessengerCallMock {
  getMockImplementation: () => MessengerCall | undefined;
  mockImplementation: (implementation: MessengerCall | undefined) => void;
}

const messengerCall = Engine.controllerMessenger
  .call as unknown as MessengerCallMock;
const pristineImplementation = messengerCall.getMockImplementation();

export const mockSentinelFeeTokens: SentinelFeeTokensByChain = {
  'eip155:1': [
    {
      assetId: 'eip155:1/slip44:60',
      symbol: 'DUM0',
    },
  ],
};

export function setupSentinelFeeTokensDataServiceMock(
  result: SentinelFeeTokensByChain | Error = mockSentinelFeeTokens,
) {
  const previousImplementation = messengerCall.getMockImplementation();

  messengerCall.mockImplementation(
    (...messengerArgs: [string, ...unknown[]]) => {
      const [action] = messengerArgs;

      if (action === 'SentinelFeeTokensDataService:getSentinelFeeTokens') {
        return result instanceof Error
          ? Promise.reject(result)
          : Promise.resolve(result);
      }

      return previousImplementation?.(...messengerArgs);
    },
  );
}

export function clearSentinelFeeTokensDataServiceMock() {
  messengerCall.mockImplementation(pristineImplementation);
}
