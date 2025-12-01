import { useSelector } from 'react-redux';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import { usePollingNetworks } from './use-polling-networks';
import { NetworkConfiguration } from '@metamask/network-controller';
import initialRootState from '../../../util/test/initial-root-state';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

jest.mock('./use-polling-networks');
jest.mock('../../../selectors/multichainAccounts/accountTreeController');

const createMockNetworkConfig = (
  chainId: string,
  networkClientId: string,
): NetworkConfiguration =>
  ({
    chainId,
    rpcEndpoints: [{ networkClientId }],
    defaultRpcEndpointIndex: 0,
  }) as NetworkConfiguration;

const arrangeMocks = () => {
  const mockUsePollingNetworks = jest
    .mocked(usePollingNetworks)
    .mockReturnValue([
      createMockNetworkConfig('0x1', 'selectedNetworkClientId'),
    ]);
  const mockSelectSelectedAccountGroupId = jest
    .mocked(selectSelectedAccountGroupId)
    .mockReturnValue('entropy:111-222-333/1');
  const mockTokenBalancesController = jest.mocked(
    Engine.context.TokenBalancesController,
  );

  jest.mocked(useSelector).mockImplementation((selector) => {
    if (selector === selectSelectedAccountGroupId) {
      return selector({});
    }
    return selector(initialRootState);
  });

  return {
    mockUsePollingNetworks,
    mockSelectSelectedAccountGroupId,
    mockTokenBalancesController,
  };
};

type ArrangedMocks = ReturnType<typeof arrangeMocks>;
type HookResult = ReturnType<
  typeof renderHookWithProvider<
    ReturnType<typeof useTokenBalancesPolling>,
    unknown
  >
>;

interface WithHookAssertionsProps {
  // can be used to update mock values
  overrideMocks?: (mocks: ArrangedMocks) => void;
  // underlying tests fill this and can assert the mocks and hook result
  testFn: (context: { mocks: ArrangedMocks; hook: HookResult }) => void;
  // allow custom hook parameters
  hookParams?: Parameters<typeof useTokenBalancesPolling>[0];
  opts?: {
    assertPollingStopped?: boolean;
  };
}

const withHookAssertions = (props: WithHookAssertionsProps) => {
  const {
    overrideMocks,
    testFn,
    hookParams,
    opts = { assertPollingStopped: true },
  } = props;
  const mocks = arrangeMocks();
  overrideMocks?.(mocks);
  // create hook
  const hook = renderHookWithProvider(
    () => useTokenBalancesPolling(hookParams),
    {
      state: initialRootState,
    },
  );
  testFn({ mocks, hook });

  mocks.mockTokenBalancesController.stopPollingByPollingToken.mockClear();
  hook.unmount();

  // Assert polling behavior based on options
  if (opts.assertPollingStopped) {
    expect(
      mocks.mockTokenBalancesController.stopPollingByPollingToken,
    ).toHaveBeenCalledTimes(1);
  } else {
    expect(
      mocks.mockTokenBalancesController.stopPollingByPollingToken,
    ).not.toHaveBeenCalled();
  }
};

const withNoPollingAssertions = (
  props: Omit<WithHookAssertionsProps, 'opts'>,
) => {
  withHookAssertions({
    ...props,
    opts: { assertPollingStopped: false },
  });
};

describe('useTokenBalancesPolling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Basic polling behavior', () => {
    it.each([
      {
        pollingNetworks: [
          createMockNetworkConfig('0x1', 'selectedNetworkClientId'),
        ],
        expectedChainIds: ['0x1'],
      },
      {
        pollingNetworks: [
          createMockNetworkConfig('0x1', 'selectedNetworkClientId'),
          createMockNetworkConfig('0x89', 'selectedNetworkClientId2'),
          createMockNetworkConfig('0xa', 'selectedNetworkClientId3'),
        ],
        expectedChainIds: ['0x1', '0x89', '0xa'],
      },
    ])(
      'should poll with chainIds $expectedChainIds',
      ({ pollingNetworks, expectedChainIds }) => {
        withHookAssertions({
          overrideMocks: (mocks) => {
            mocks.mockUsePollingNetworks.mockReturnValue(pollingNetworks);
          },
          testFn: ({ mocks }) => {
            expect(
              mocks.mockTokenBalancesController.startPolling,
            ).toHaveBeenCalledTimes(1);
            expect(
              mocks.mockTokenBalancesController.startPolling,
            ).toHaveBeenCalledWith({
              chainIds: expectedChainIds,
              selectedAccountGroupId: expect.any(String),
            });
          },
        });
      },
    );

    it('should not poll when no networks are available', () => {
      withNoPollingAssertions({
        overrideMocks: (mocks) => {
          mocks.mockUsePollingNetworks.mockReturnValue([]);
        },
        testFn: ({ mocks }) => {
          expect(
            mocks.mockTokenBalancesController.startPolling,
          ).not.toHaveBeenCalled();
        },
      });
    });
  });

  describe('ChainIds override behavior', () => {
    it('should poll with provided chainIds', () => {
      withHookAssertions({
        hookParams: { chainIds: ['0x1', '0x89', '0xa'] },
        testFn: ({ mocks }) => {
          expect(
            mocks.mockTokenBalancesController.startPolling,
          ).toHaveBeenCalledTimes(1);
          expect(
            mocks.mockTokenBalancesController.startPolling,
          ).toHaveBeenCalledWith({
            chainIds: ['0x1', '0x89', '0xa'],
            selectedAccountGroupId: expect.any(String),
          });
        },
      });
    });
  });

  describe('Selected account group behavior', () => {
    it('should restart polling when selectedAccountGroupId changes', () => {
      withHookAssertions({
        overrideMocks: (mocks) =>
          mocks.mockSelectSelectedAccountGroupId
            .mockReturnValueOnce('entropy:111-222-333/1')
            .mockReturnValue('entropy:111-222-333/2'),

        testFn: ({ mocks, hook }) => {
          // Assert - 1st render is with first account address
          expect(
            mocks.mockTokenBalancesController.startPolling,
          ).toHaveBeenNthCalledWith(1, {
            chainIds: ['0x1'],
            selectedAccountGroupId: 'entropy:111-222-333/1',
          });

          // Act - rerender to change accounts
          hook.rerender({});

          // Assert - polling stopped on old data
          expect(
            mocks.mockTokenBalancesController.stopPollingByPollingToken,
          ).toHaveBeenCalled();
          expect(
            mocks.mockTokenBalancesController.startPolling,
          ).toHaveBeenNthCalledWith(2, {
            chainIds: ['0x1'],
            selectedAccountGroupId: 'entropy:111-222-333/2',
          });
        },
      });
    });
  });
});
