import { renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import {
  BASE_DEPOSIT_NETWORK,
  type PredictDepositNetwork,
} from '../../../config/depositEnvironment';
import { useUsdcBalance } from './useUsdcBalance';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(),
      },
      AssetsContractController: {
        getERC20BalanceOf: jest.fn(),
      },
    },
  },
}));

const ADDRESS = '0x0000000000000000000000000000000000000001';

describe('useUsdcBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stays loading while only network is missing and never flashes unavailable when network becomes ready', async () => {
    let resolveBalance: (value: unknown) => void = () => undefined;
    jest
      .mocked(Engine.context.NetworkController.findNetworkClientIdByChainId)
      .mockReturnValue('base-mainnet' as never);
    jest
      .mocked(Engine.context.AssetsContractController.getERC20BalanceOf)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveBalance = resolve;
          }) as never,
      );

    const observedStatuses: string[] = [];
    const { result, rerender } = renderHook(
      ({
        network,
        address,
        enabled,
      }: {
        network: PredictDepositNetwork | undefined;
        address: string | undefined;
        enabled: boolean;
      }) => {
        const balance = useUsdcBalance({ network, address, enabled });
        observedStatuses.push(balance.status);
        return balance;
      },
      {
        initialProps: {
          network: undefined as PredictDepositNetwork | undefined,
          address: ADDRESS as string | undefined,
          enabled: true,
        },
      },
    );

    expect(result.current).toStrictEqual({ status: 'loading' });

    rerender({
      network: BASE_DEPOSIT_NETWORK,
      address: ADDRESS,
      enabled: true,
    });

    expect(result.current).toStrictEqual({ status: 'loading' });
    expect(observedStatuses).not.toContain('unavailable');

    resolveBalance({ toString: () => '100000000' });

    await waitFor(() =>
      expect(result.current).toStrictEqual({
        status: 'ready',
        baseUnits: BigInt(100_000_000),
      }),
    );
  });

  it('returns unavailable when address is missing, disabled, or the read fails', async () => {
    const missingAddress = renderHook(() =>
      useUsdcBalance({
        network: BASE_DEPOSIT_NETWORK,
        address: undefined,
        enabled: true,
      }),
    );
    expect(missingAddress.result.current).toStrictEqual({
      status: 'unavailable',
    });

    const disabled = renderHook(() =>
      useUsdcBalance({
        network: BASE_DEPOSIT_NETWORK,
        address: ADDRESS,
        enabled: false,
      }),
    );
    expect(disabled.result.current).toStrictEqual({ status: 'unavailable' });

    jest
      .mocked(Engine.context.NetworkController.findNetworkClientIdByChainId)
      .mockReturnValue(undefined as never);
    const failedRead = renderHook(() =>
      useUsdcBalance({
        network: BASE_DEPOSIT_NETWORK,
        address: ADDRESS,
        enabled: true,
      }),
    );
    await waitFor(() =>
      expect(failedRead.result.current).toStrictEqual({
        status: 'unavailable',
      }),
    );
  });
});
