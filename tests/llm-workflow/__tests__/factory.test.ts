import { createMetaMaskMobileContext } from '../capabilities/factory';
import { MetaMaskMobileStateSnapshotCapability } from '../capabilities/state-snapshot';

jest.mock('@metamask/client-mcp-core', () => ({}));
jest.mock('../capabilities/state-snapshot');

const MockedStateSnapshotCapability =
  MetaMaskMobileStateSnapshotCapability as jest.MockedClass<
    typeof MetaMaskMobileStateSnapshotCapability
  >;

describe('createMetaMaskMobileContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a prod context with only state snapshot support', () => {
    const getPlatformDriver = () => undefined;

    const context = createMetaMaskMobileContext({ getPlatformDriver });

    expect(context.config).toEqual({
      extensionName: 'MetaMask',
      defaultPassword: 'correct horse battery staple',
      artifactsDir: 'test-artifacts',
      environment: 'prod',
      defaultChainId: 1,
    });
    expect(context.stateSnapshot).toBeDefined();
    expect(context.fixture).toBeUndefined();
    expect(context.chain).toBeUndefined();
    expect(context.contractSeeding).toBeUndefined();
    expect(context.mockServer).toBeUndefined();
    expect(MockedStateSnapshotCapability).toHaveBeenCalledWith({
      getPlatformDriver,
    });
  });

  it('preserves prod while applying supported configuration overrides', () => {
    const context = createMetaMaskMobileContext({
      config: { artifactsDir: 'custom-artifacts', defaultChainId: 59144 },
      getPlatformDriver: () => undefined,
    });

    expect(context.config.environment).toBe('prod');
    expect(context.config.artifactsDir).toBe('custom-artifacts');
    expect(context.config.defaultChainId).toBe(59144);
  });
});
