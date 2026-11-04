import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictActivity } from '../../Predict/hooks/usePredictActivity';
import { expectInactiveHookHasNoSideEffects } from './inactiveHook.testUtils';

const mockGetActivity = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getActivity: (...args: unknown[]) => mockGetActivity(...args),
    },
  },
}));

jest.mock('../../Predict/utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

const mockEnsurePolygonNetworkExists = jest.fn<Promise<void>, []>();
jest.mock('../../Predict/hooks/usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('expectInactiveHookHasNoSideEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue({
      activities: [],
      nextCursor: undefined,
    });
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  it('passes when disabled legacy usePredictActivity skips its side effects', async () => {
    const assertion = expectInactiveHookHasNoSideEffects({
      useInactiveHook: () => usePredictActivity({ enabled: false }),
      sideEffects: [mockEnsurePolygonNetworkExists, mockGetActivity],
      wrapper: createWrapper(),
    });

    await expect(assertion).resolves.toBeUndefined();
  });

  it('fails when the hook runs a side effect', async () => {
    const assertion = expectInactiveHookHasNoSideEffects({
      useInactiveHook: () => usePredictActivity({ enabled: true }),
      sideEffects: [mockEnsurePolygonNetworkExists],
      wrapper: createWrapper(),
    });

    await expect(assertion).rejects.toThrow('not.toHaveBeenCalled');
  });
});
