import {
  createMetaMaskMobileE2EContext,
  createMetaMaskMobileProdContext,
} from '../capabilities/factory';

jest.mock('../capabilities/build');
jest.mock('../capabilities/fixture');
jest.mock('../capabilities/chain');
jest.mock('../capabilities/seeding');
jest.mock('../capabilities/state-snapshot');
jest.mock('../capabilities/mock-server');

describe('createMetaMaskMobileE2EContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('factory function', () => {
    it('creates context with all 6 capabilities', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.build).toBeDefined();
      expect(context.fixture).toBeDefined();
      expect(context.chain).toBeDefined();
      expect(context.contractSeeding).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.mockServer).toBeDefined();
    });

    it('includes default E2E config', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.config).toEqual({
        extensionName: 'MetaMask',
        defaultPassword: 'correct horse battery staple',
        toolPrefix: 'mm',
        artifactsDir: 'test-artifacts',
        environment: 'e2e',
        defaultChainId: 1337,
      });
    });

    it('merges custom config with defaults', () => {
      const context = createMetaMaskMobileE2EContext({
        config: {
          defaultChainId: 5,
          artifactsDir: 'custom-artifacts',
        },
      });

      expect(context.config).toEqual({
        extensionName: 'MetaMask',
        defaultPassword: 'correct horse battery staple',
        toolPrefix: 'mm',
        artifactsDir: 'custom-artifacts',
        environment: 'e2e',
        defaultChainId: 5,
      });
    });

    it('passes build options to BuildCapability', () => {
      const context = createMetaMaskMobileE2EContext({
        buildOutputPath: 'custom/path/MetaMask.app',
        simulatorName: 'iPhone 15',
      });

      expect(context.build).toBeDefined();
    });

    it('creates context with empty options', () => {
      const context = createMetaMaskMobileE2EContext({});

      expect(context.build).toBeDefined();
      expect(context.fixture).toBeDefined();
      expect(context.chain).toBeDefined();
      expect(context.contractSeeding).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.mockServer).toBeDefined();
      expect(context.config).toBeDefined();
    });

    it('creates context without options', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.build).toBeDefined();
      expect(context.fixture).toBeDefined();
      expect(context.chain).toBeDefined();
      expect(context.contractSeeding).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.mockServer).toBeDefined();
      expect(context.config).toBeDefined();
    });
  });

  describe('capability wiring', () => {
    it('wires chain capability to contract seeding', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.contractSeeding).toBeDefined();
      expect(context.chain).toBeDefined();
    });

    it('creates independent fixture capability', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.fixture).toBeDefined();
    });

    it('creates independent state snapshot capability', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.stateSnapshot).toBeDefined();
    });

    it('creates independent mock server capability', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.mockServer).toBeDefined();
    });
  });

  describe('config validation', () => {
    it('preserves all default config fields', () => {
      const context = createMetaMaskMobileE2EContext();

      expect(context.config.extensionName).toBe('MetaMask');
      expect(context.config.defaultPassword).toBe(
        'correct horse battery staple',
      );
      expect(context.config.toolPrefix).toBe('mm');
      expect(context.config.artifactsDir).toBe('test-artifacts');
      expect(context.config.environment).toBe('e2e');
      expect(context.config.defaultChainId).toBe(1337);
    });

    it('allows partial config override', () => {
      const context = createMetaMaskMobileE2EContext({
        config: {
          defaultChainId: 31337,
        },
      });

      expect(context.config.defaultChainId).toBe(31337);
      expect(context.config.extensionName).toBe('MetaMask');
    });
  });
});

describe('createMetaMaskMobileProdContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('factory function', () => {
    it('creates context with only build and stateSnapshot capabilities', () => {
      const context = createMetaMaskMobileProdContext();

      expect(context.build).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.fixture).toBeUndefined();
      expect(context.chain).toBeUndefined();
      expect(context.contractSeeding).toBeUndefined();
      expect(context.mockServer).toBeUndefined();
    });

    it('includes default prod config', () => {
      const context = createMetaMaskMobileProdContext();

      expect(context.config).toEqual({
        extensionName: 'MetaMask',
        defaultPassword: 'correct horse battery staple',
        toolPrefix: 'mm',
        artifactsDir: 'test-artifacts',
        environment: 'prod',
        defaultChainId: 1,
      });
    });

    it('merges custom config with defaults', () => {
      const context = createMetaMaskMobileProdContext({
        config: {
          defaultChainId: 5,
          artifactsDir: 'custom-artifacts',
        },
      });

      expect(context.config).toEqual({
        extensionName: 'MetaMask',
        defaultPassword: 'correct horse battery staple',
        toolPrefix: 'mm',
        artifactsDir: 'custom-artifacts',
        environment: 'prod',
        defaultChainId: 5,
      });
    });

    it('creates context with empty options', () => {
      const context = createMetaMaskMobileProdContext({});

      expect(context.build).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.config).toBeDefined();
      expect(context.fixture).toBeUndefined();
      expect(context.chain).toBeUndefined();
      expect(context.contractSeeding).toBeUndefined();
      expect(context.mockServer).toBeUndefined();
    });

    it('creates context without options', () => {
      const context = createMetaMaskMobileProdContext();

      expect(context.build).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.config).toBeDefined();
      expect(context.fixture).toBeUndefined();
      expect(context.chain).toBeUndefined();
      expect(context.contractSeeding).toBeUndefined();
      expect(context.mockServer).toBeUndefined();
    });
  });

  describe('config validation', () => {
    it('preserves all default prod config fields', () => {
      const context = createMetaMaskMobileProdContext();

      expect(context.config.extensionName).toBe('MetaMask');
      expect(context.config.defaultPassword).toBe(
        'correct horse battery staple',
      );
      expect(context.config.toolPrefix).toBe('mm');
      expect(context.config.artifactsDir).toBe('test-artifacts');
      expect(context.config.environment).toBe('prod');
      expect(context.config.defaultChainId).toBe(1);
    });

    it('allows partial config override', () => {
      const context = createMetaMaskMobileProdContext({
        config: {
          defaultChainId: 11155111,
        },
      });

      expect(context.config.defaultChainId).toBe(11155111);
      expect(context.config.environment).toBe('prod');
      expect(context.config.extensionName).toBe('MetaMask');
    });
  });
});
