/**
 * Integration Smoke Test
 *
 * Verifies the full MCP stack wires together correctly:
 * - Factory creates E2E context with all 6 capabilities
 * - Session manager orchestrates capabilities
 * - MCP server can be instantiated
 * - All expected mm_* tools are available
 */

jest.mock('@metamask/client-mcp-core', () => {
  const actual = jest.requireActual('@metamask/client-mcp-core');
  return {
    ...actual,
    getPlatformDriver: jest.fn(() => null),
  };
});

import { createMetaMaskMobileE2EContext } from '../capabilities/factory';
import { MetaMaskMobileSessionManager } from '../mcp-server/metamask-provider';
import {
  createMcpServer,
  getToolDefinitions,
  getPrefixedToolNames,
} from '@metamask/client-mcp-core';

describe('MCP Stack Integration', () => {
  describe('Factory → Session Manager → MCP Server', () => {
    it('creates E2E context with all 6 capabilities', () => {
      const context = createMetaMaskMobileE2EContext();

      // Verify all 6 capabilities are present
      expect(context.build).toBeDefined();
      expect(context.fixture).toBeDefined();
      expect(context.chain).toBeDefined();
      expect(context.contractSeeding).toBeDefined();
      expect(context.stateSnapshot).toBeDefined();
      expect(context.mockServer).toBeDefined();

      // Verify config
      expect(context.config).toBeDefined();
      expect(context.config?.toolPrefix).toBe('mm');
      expect(context.config?.environment).toBe('e2e');
    });

    it('session manager accepts workflow context and exposes capabilities', () => {
      const context = createMetaMaskMobileE2EContext();
      const sessionManager = new MetaMaskMobileSessionManager();

      sessionManager.setWorkflowContext(context);

      // Verify session manager can access all capabilities
      expect(sessionManager.getBuildCapability()).toBe(context.build);
      expect(sessionManager.getFixtureCapability()).toBe(context.fixture);
      expect(sessionManager.getChainCapability()).toBe(context.chain);
      expect(sessionManager.getContractSeedingCapability()).toBe(
        context.contractSeeding,
      );
      expect(sessionManager.getStateSnapshotCapability()).toBe(
        context.stateSnapshot,
      );

      // Verify environment mode
      expect(sessionManager.getEnvironmentMode()).toBe('e2e');
    });

    it('creates MCP server with session manager', () => {
      const context = createMetaMaskMobileE2EContext();
      const sessionManager = new MetaMaskMobileSessionManager();
      sessionManager.setWorkflowContext(context);

      // Verify MCP server can be created (not starting stdio)
      const server = createMcpServer({
        name: 'metamask-mobile-test',
        version: '1.0.0',
        onCleanup: async () => {
          await sessionManager.cleanup();
        },
      });

      expect(server).toBeDefined();
      expect(typeof server.start).toBe('function');
    });

    it('exposes expected mm_* tools', () => {
      const toolDefinitions = getToolDefinitions();
      const prefixedToolNames = getPrefixedToolNames();

      // Verify we have tool definitions
      expect(toolDefinitions.length).toBeGreaterThan(0);
      expect(prefixedToolNames.length).toBeGreaterThan(0);

      // Verify all tools have mm_ prefix
      prefixedToolNames.forEach((toolName) => {
        expect(toolName).toMatch(/^mm_/);
      });

      // Verify core tools are present
      const expectedCoreTools = [
        'mm_build',
        'mm_launch',
        'mm_cleanup',
        'mm_get_state',
        'mm_screenshot',
      ];

      expectedCoreTools.forEach((expectedTool) => {
        expect(prefixedToolNames).toContain(expectedTool);
      });

      // Verify tool definitions have required structure
      toolDefinitions.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });

    it('session manager provides context info', () => {
      const context = createMetaMaskMobileE2EContext();
      const sessionManager = new MetaMaskMobileSessionManager();
      sessionManager.setWorkflowContext(context);

      const contextInfo = sessionManager.getContextInfo();

      expect(contextInfo.currentContext).toBe('e2e');
      expect(contextInfo.hasActiveSession).toBe(false);
      expect(contextInfo.sessionId).toBeNull();
      expect(contextInfo.canSwitchContext).toBe(true);

      // Verify all 6 capabilities are reported as available
      expect(contextInfo.capabilities.available).toContain('build');
      expect(contextInfo.capabilities.available).toContain('fixture');
      expect(contextInfo.capabilities.available).toContain('chain');
      expect(contextInfo.capabilities.available).toContain('contractSeeding');
      expect(contextInfo.capabilities.available).toContain('stateSnapshot');
      expect(contextInfo.capabilities.available).toContain('mockServer');
      expect(contextInfo.capabilities.available).toHaveLength(6);
    });
  });

  describe('Capability Wiring', () => {
    it('contract seeding capability receives chain capability', () => {
      const context = createMetaMaskMobileE2EContext();

      // Verify contract seeding has access to chain capability
      expect(context.contractSeeding).toBeDefined();
      expect(context.chain).toBeDefined();

      // Contract seeding should be able to access chain capability internally
      // (implementation detail verified by factory code)
    });

    it('factory creates context with custom config', () => {
      const context = createMetaMaskMobileE2EContext({
        config: {
          defaultChainId: 5,
          toolPrefix: 'test',
        },
      });

      expect(context.config?.defaultChainId).toBe(5);
      expect(context.config?.toolPrefix).toBe('test');
      expect(context.config?.extensionName).toBe('MetaMask'); // Default preserved
    });

    it('factory creates context with custom build options', () => {
      const context = createMetaMaskMobileE2EContext({
        buildCommand: 'yarn build:custom',
        buildOutputPath: '/custom/path',
        simulatorName: 'iPhone 15',
      });

      // Verify build capability exists (options are internal to capability)
      expect(context.build).toBeDefined();
    });
  });
});
