import {
  createMetaMaskMobileE2EContext,
  createMetaMaskMobileProdContext,
} from '../capabilities/factory';
import { MetaMaskMobileChainCapability } from '../capabilities/chain';
import { MetaMaskMobileFixtureCapability } from '../capabilities/fixture';
import { MetaMaskMobileContractSeedingCapability } from '../capabilities/seeding';
import { MetaMaskMobileMockServerCapability } from '../capabilities/mock-server';
import { MetaMaskMobileStateSnapshotCapability } from '../capabilities/state-snapshot';

jest.mock('@metamask/client-mcp-core', () => ({}));
jest.mock('../capabilities/chain');
jest.mock('../capabilities/fixture');
jest.mock('../capabilities/seeding');
jest.mock('../capabilities/state-snapshot');
jest.mock('../capabilities/mock-server');

const MockedChainCapability = MetaMaskMobileChainCapability as jest.MockedClass<
  typeof MetaMaskMobileChainCapability
>;
const MockedFixtureCapability =
  MetaMaskMobileFixtureCapability as jest.MockedClass<
    typeof MetaMaskMobileFixtureCapability
  >;
const MockedSeedingCapability =
  MetaMaskMobileContractSeedingCapability as jest.MockedClass<
    typeof MetaMaskMobileContractSeedingCapability
  >;
const MockedMockServerCapability =
  MetaMaskMobileMockServerCapability as jest.MockedClass<
    typeof MetaMaskMobileMockServerCapability
  >;
const MockedStateSnapshotCapability =
  MetaMaskMobileStateSnapshotCapability as jest.MockedClass<
    typeof MetaMaskMobileStateSnapshotCapability
  >;

const getPlatformDriver = () => undefined;

describe('createMetaMaskMobileE2EContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns a WorkflowContext with all 5 capabilities when called with defaults', () => {
    const context = createMetaMaskMobileE2EContext({ getPlatformDriver });

    expect(context.chain).toBeDefined();
    expect(context.fixture).toBeDefined();
    expect(context.contractSeeding).toBeDefined();
    expect(context.stateSnapshot).toBeDefined();
    expect(context.mockServer).toBeDefined();
  });

  it('uses defaults from DEFAULT_E2E_CONFIG', () => {
    const context = createMetaMaskMobileE2EContext({ getPlatformDriver });

    expect(context.config).toEqual({
      extensionName: 'MetaMask',
      defaultPassword: 'correct horse battery staple',
      artifactsDir: 'test-artifacts',
      environment: 'e2e',
      defaultChainId: 1337,
    });
  });

  it('respects custom port overrides', () => {
    createMetaMaskMobileE2EContext({
      config: { ports: { anvil: 9555, fixtureServer: 15555 } },
      mockServer: { port: 9000 },
      getPlatformDriver,
    });

    expect(MockedChainCapability).toHaveBeenCalledWith({
      port: 9555,
      chainId: 1337,
    });
    expect(MockedFixtureCapability).toHaveBeenCalledWith({ port: 15555 });
    expect(MockedMockServerCapability).toHaveBeenCalledWith({ port: 9000 });
  });

  it('wires chain capability into contract seeding capability', () => {
    const context = createMetaMaskMobileE2EContext({ getPlatformDriver });

    expect(MockedSeedingCapability).toHaveBeenCalledWith({
      chainCapability: context.chain,
    });
  });

  it('passes getPlatformDriver to state snapshot capability', () => {
    createMetaMaskMobileE2EContext({ getPlatformDriver });

    expect(MockedStateSnapshotCapability).toHaveBeenCalledWith({
      getPlatformDriver,
    });
  });

  it('omits mockServer when mock server is disabled', () => {
    const context = createMetaMaskMobileE2EContext({
      mockServer: { enabled: false },
      getPlatformDriver,
    });

    expect(context.mockServer).toBeUndefined();
    expect(MockedMockServerCapability).not.toHaveBeenCalled();
  });
});

describe('createMetaMaskMobileProdContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns only stateSnapshot capability', () => {
    const context = createMetaMaskMobileProdContext({ getPlatformDriver });

    expect(context.stateSnapshot).toBeDefined();
    expect(context.fixture).toBeUndefined();
    expect(context.chain).toBeUndefined();
    expect(context.contractSeeding).toBeUndefined();
    expect(context.mockServer).toBeUndefined();
  });

  it('uses defaults from prod config', () => {
    const context = createMetaMaskMobileProdContext({ getPlatformDriver });

    expect(context.config).toEqual({
      extensionName: 'MetaMask',
      defaultPassword: 'correct horse battery staple',
      artifactsDir: 'test-artifacts',
      environment: 'prod',
      defaultChainId: 1,
    });
  });
});
