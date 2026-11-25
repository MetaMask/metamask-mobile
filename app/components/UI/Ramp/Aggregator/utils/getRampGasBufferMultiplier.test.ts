import Engine from '../../../../../core/Engine';
import { getRampGasBufferMultiplier } from './getRampGasBufferMultiplier';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: jest.fn(),
    },
    RemoteFeatureFlagController: {
      state: {
        remoteFeatureFlags: {},
      },
    },
  },
}));

const mockGetNetworkClientById = jest.mocked(
  Engine.context.NetworkController.getNetworkClientById,
);

function setRpcEndpointType(type: 'infura' | 'custom') {
  mockGetNetworkClientById.mockReturnValue({
    configuration: { type },
  } as unknown as ReturnType<
    typeof Engine.context.NetworkController.getNetworkClientById
  >);
}

function setGasBufferFlag(flag: unknown) {
  (
    Engine.context.RemoteFeatureFlagController as unknown as {
      state: { remoteFeatureFlags: Record<string, unknown> };
    }
  ).state.remoteFeatureFlags = {
    confirmations_gas_buffer: flag,
  };
}

describe('getRampGasBufferMultiplier', () => {
  beforeEach(() => {
    mockGetNetworkClientById.mockReset();
    setRpcEndpointType('infura');
    setGasBufferFlag(undefined);
  });

  it('returns 1 when the flag is absent', () => {
    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1);
  });

  it('prefers perChainConfig.included for included RPCs', () => {
    setGasBufferFlag({
      default: 1.1,
      included: 1.2,
      perChainConfig: {
        '0x1': { base: 1.3, included: 1.4 },
      },
    });

    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.4);
  });

  it('ignores included buffers for custom RPCs', () => {
    setRpcEndpointType('custom');
    setGasBufferFlag({
      default: 1.1,
      included: 1.2,
      perChainConfig: {
        '0x1': { base: 1.3, included: 1.4 },
      },
    });

    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.3);
  });

  it('falls back chain base → included → default', () => {
    const flag = {
      default: 1.1,
      included: 1.2,
      perChainConfig: {
        '0x1': { base: 1.3 },
      },
    };

    setGasBufferFlag(flag);
    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.3);

    setGasBufferFlag({ default: 1.1, included: 1.2 });
    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.2);

    setGasBufferFlag({ default: 1.1 });
    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.1);
  });

  it('uses the default buffer for a custom RPC with only an included buffer', () => {
    setRpcEndpointType('custom');
    setGasBufferFlag({ default: 1.1, included: 1.2 });

    expect(getRampGasBufferMultiplier('0x1', 'mainnet')).toBe(1.1);
  });
});
