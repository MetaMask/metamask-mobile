import { SolScope } from '@metamask/keyring-api';
import { NETWORKS_CHAIN_ID } from '../../app/constants/network';
import { isCaipChainId } from '@metamask/utils';
import { createLogger } from '../../tests/framework/logger';

const logger = createLogger({
  name: 'MultichainUtilities',
});

/**
 * Session result structure from multichain test dapp
 */
export interface SessionResult {
  success: boolean;
  sessionScopes?: Record<
    string,
    {
      accounts: string[];
      methods?: string[]; // Optional since some responses might not include methods
    }
  >;
}

/**
 * Session scope data structure
 */
export interface SessionScope {
  accounts: string[];
  methods?: string[];
}

/**
 * Comprehensive session assertions for validation
 */
export interface SessionAssertions {
  structureValid: boolean;
  success: boolean;
  chainsValid: boolean;
  chainCount: number;
  expectedCount: number;
  foundChains: string[];
  missingChains: string[];
  details: {
    error?: string;
    sessionScopes?: Record<string, SessionScope>;
    expectedScopes?: string[];
    foundScopes?: string[];
  };
}

/**
 * Multichain and CAIP-25 utilities for E2E tests
 * Centralizes common functionality for wallet_createSession and related multichain tests
 */
export default class MultichainUtilities {
  /**
   * Converts hex chain ID to decimal string format used by dapps
   * @param chainId - Hex chain ID (e.g., '0x1')
   * @returns Decimal chain ID (e.g., '1')
   */
  static getDecimalChainId(chainId: string): string {
    if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x')) {
      return chainId;
    }
    return parseInt(chainId, 16).toString(10);
  }

  /**
   * Generates EIP-155 scope identifier from chain ID
   * @param chainId - Decimal chain ID (e.g., '1')
   * @returns EIP-155 scope (e.g., 'eip155:1')
   */
  static getEIP155Scope(chainId: string): string {
    return `eip155:${chainId}`;
  }

  /**
   * Gets the CAIP-25 chain ID for a given chain
   * @param chainId - Chain ID (e.g., 'solana')
   * @returns CAIP-25 chain ID (e.g., 'solana:mainnet')
   */
  static getScope(chainId: string): string {
    if (isCaipChainId(chainId)) {
      return chainId;
    }
    return this.getEIP155Scope(chainId);
  }

  /**
   * Network chain IDs in decimal format for dapp usage
   */
  static get CHAIN_IDS() {
    return {
      ETHEREUM_MAINNET: this.getDecimalChainId(NETWORKS_CHAIN_ID.MAINNET),
      LINEA_MAINNET: this.getDecimalChainId(NETWORKS_CHAIN_ID.LINEA_MAINNET),
      ARBITRUM_ONE: this.getDecimalChainId(NETWORKS_CHAIN_ID.ARBITRUM),
      AVALANCHE: this.getDecimalChainId(NETWORKS_CHAIN_ID.AVAXCCHAIN),
      OPTIMISM: this.getDecimalChainId(NETWORKS_CHAIN_ID.OPTIMISM),
      POLYGON: this.getDecimalChainId(NETWORKS_CHAIN_ID.POLYGON),
      ZKSYNC_ERA: this.getDecimalChainId(NETWORKS_CHAIN_ID.ZKSYNC_ERA),
      BASE: this.getDecimalChainId(NETWORKS_CHAIN_ID.BASE),
      BSC: this.getDecimalChainId(NETWORKS_CHAIN_ID.BSC),
      LOCALHOST: this.getDecimalChainId(NETWORKS_CHAIN_ID.LOCALHOST),
    };
  }

  /**
   * EIP-155 scope identifiers for session validation
   */
  static get EIP155_SCOPES() {
    const chainIds = this.CHAIN_IDS;
    return {
      ETHEREUM_MAINNET: this.getEIP155Scope(chainIds.ETHEREUM_MAINNET),
      LINEA_MAINNET: this.getEIP155Scope(chainIds.LINEA_MAINNET),
      ARBITRUM_ONE: this.getEIP155Scope(chainIds.ARBITRUM_ONE),
      AVALANCHE: this.getEIP155Scope(chainIds.AVALANCHE),
      OPTIMISM: this.getEIP155Scope(chainIds.OPTIMISM),
      POLYGON: this.getEIP155Scope(chainIds.POLYGON),
      ZKSYNC_ERA: this.getEIP155Scope(chainIds.ZKSYNC_ERA),
      BASE: this.getEIP155Scope(chainIds.BASE),
      BSC: this.getEIP155Scope(chainIds.BSC),
      LOCALHOST: this.getEIP155Scope(chainIds.LOCALHOST),
    };
  }

  /**
   * CAIP-25 scope identifiers
   */
  static SCOPES() {
    return {
      ...this.EIP155_SCOPES,
      SOLANA_MAINNET: SolScope.Mainnet,
    };
  }

  /**
   * Common network combinations for testing
   */
  static get NETWORK_COMBINATIONS() {
    const chainIds = this.CHAIN_IDS;
    return {
      SINGLE_ETHEREUM: [chainIds.ETHEREUM_MAINNET],
      ETHEREUM_LINEA: [chainIds.ETHEREUM_MAINNET, chainIds.LINEA_MAINNET],
      ETHEREUM_ARBITRUM: [chainIds.ETHEREUM_MAINNET, chainIds.ARBITRUM_ONE],
      ETHEREUM_POLYGON: [chainIds.ETHEREUM_MAINNET, chainIds.POLYGON],
      L2_NETWORKS: [
        chainIds.LINEA_MAINNET,
        chainIds.ARBITRUM_ONE,
        chainIds.OPTIMISM,
        chainIds.BASE,
      ],
      ALL_MAJOR_EVM: [
        chainIds.ETHEREUM_MAINNET,
        chainIds.ARBITRUM_ONE,
        chainIds.OPTIMISM,
        chainIds.POLYGON,
        chainIds.BASE,
      ],
      ALL_EVM_NETWORKS: [
        chainIds.ETHEREUM_MAINNET,
        chainIds.ARBITRUM_ONE,
        chainIds.OPTIMISM,
        chainIds.POLYGON,
        chainIds.BASE,
        chainIds.BSC,
      ],
    };
  }

  /**
   * Validates that a session result has the expected structure
   * @param sessionResult - Session result from createSession call
   * @returns True if session has valid structure
   */
  static validateSessionStructure(
    sessionResult: unknown,
  ): sessionResult is SessionResult {
    if (!sessionResult || typeof sessionResult !== 'object') {
      return false;
    }

    const result = sessionResult as Record<string, unknown>;

    if (typeof result.success !== 'boolean') {
      return false;
    }

    if (result.success && !result.sessionScopes) {
      return false;
    }

    return true;
  }

  /**
   * Validates that session contains expected chains
   * @param sessionResult - Session result from createSession call
   * @param expectedChainIds - Array of decimal chain IDs to verify
   * @returns True if all expected chains are present
   */
  static validateSessionContainsChains(
    sessionResult: SessionResult,
    expectedChainIds: string[],
  ): boolean {
    if (
      !this.validateSessionStructure(sessionResult) ||
      !sessionResult.success
    ) {
      return false;
    }

    const { sessionScopes } = sessionResult;
    if (!sessionScopes) {
      return false;
    }

    const expectedScopes = expectedChainIds.map((chainId) =>
      this.getEIP155Scope(chainId),
    );

    return expectedScopes.every((scope) => {
      const scopeData = sessionScopes[scope];
      return (
        scopeData?.accounts &&
        Array.isArray(scopeData.accounts) &&
        scopeData.accounts.length > 0
      );
    });
  }

  /**
   * Gets count of EVM chains in session
   * @param sessionResult - Session result from createSession call
   * @returns Number of EVM chains in session
   */
  static getEVMChainCount(sessionResult: SessionResult): number {
    if (
      !this.validateSessionStructure(sessionResult) ||
      !sessionResult.success
    ) {
      return 0;
    }

    const { sessionScopes } = sessionResult;
    if (!sessionScopes) {
      return 0;
    }

    return Object.keys(sessionScopes).filter((scope) =>
      scope.startsWith('eip155:'),
    ).length;
  }

  /**
   * Extracts all EVM chain IDs from session
   * @param sessionResult - Session result from createSession call
   * @returns Array of decimal chain IDs found in session
   */
  static getEVMChainIdsFromSession(sessionResult: SessionResult): string[] {
    if (
      !this.validateSessionStructure(sessionResult) ||
      !sessionResult.success
    ) {
      return [];
    }

    const { sessionScopes } = sessionResult;
    if (!sessionScopes) {
      return [];
    }

    return Object.keys(sessionScopes)
      .filter((scope) => scope.startsWith('eip155:'))
      .map((scope) => scope.split(':')[1]);
  }

  /**
   * Generates test assertions for common session validation
   * @param sessionResult - Session result to validate
   * @param expectedChainIds - Expected chain IDs
   * @returns Object with assertion results and details
   */
  static generateSessionAssertions(
    sessionResult: unknown,
    expectedChainIds: string[],
  ): SessionAssertions {
    const assertions: SessionAssertions = {
      structureValid: this.validateSessionStructure(sessionResult),
      success: false,
      chainsValid: false,
      chainCount: 0,
      expectedCount: expectedChainIds.length,
      foundChains: [],
      missingChains: [],
      details: {},
    };

    if (!assertions.structureValid) {
      assertions.details.error = 'Invalid session structure';
      return assertions;
    }

    // TypeScript now knows sessionResult is SessionResult due to type guard
    const validSessionResult = sessionResult as SessionResult;
    assertions.success = validSessionResult.success;

    if (!assertions.success) {
      assertions.details.error = 'Session creation failed';
      return assertions;
    }

    assertions.chainCount = this.getEVMChainCount(validSessionResult);
    assertions.foundChains = this.getEVMChainIdsFromSession(validSessionResult);
    assertions.chainsValid = this.validateSessionContainsChains(
      validSessionResult,
      expectedChainIds,
    );

    assertions.missingChains = expectedChainIds.filter(
      (chainId) => !assertions.foundChains.includes(chainId),
    );

    assertions.details = {
      sessionScopes: validSessionResult.sessionScopes,
      expectedScopes: expectedChainIds.map((id) => this.getEIP155Scope(id)),
      foundScopes: Object.keys(validSessionResult.sessionScopes || {}),
    };

    return assertions;
  }

  /**
   * Network names mapping (for logging and debugging)
   */
  static get NETWORK_NAMES(): Record<string, string> {
    return {
      [this.CHAIN_IDS.ETHEREUM_MAINNET]: 'Ethereum Mainnet',
      [this.CHAIN_IDS.LINEA_MAINNET]: 'Linea Mainnet',
      [this.CHAIN_IDS.ARBITRUM_ONE]: 'Arbitrum One',
      [this.CHAIN_IDS.AVALANCHE]: 'Avalanche',
      [this.CHAIN_IDS.OPTIMISM]: 'OP Mainnet',
      [this.CHAIN_IDS.POLYGON]: 'Polygon Mainnet',
      [this.CHAIN_IDS.ZKSYNC_ERA]: 'zkSync Era',
      [this.CHAIN_IDS.BASE]: 'Base',
      [this.CHAIN_IDS.BSC]: 'BNB Smart Chain',
      [this.CHAIN_IDS.LOCALHOST]: 'Localhost',
    };
  }

  /**
   * Gets human-readable network name for chain ID
   * @param chainId - Decimal chain ID
   * @returns Human-readable network name
   */
  static getNetworkName(chainId: string): string {
    return this.NETWORK_NAMES[chainId] || `Unknown Network (${chainId})`;
  }

  /**
   * Logs session details in a formatted way for debugging
   * @param sessionResult - Session result to log
   * @param testName - Name of the test for context
   */
  static logSessionDetails(
    sessionResult: SessionResult,
    testName: string = 'Session Test',
  ): void {
    logger.info(`\n📊 ${testName} - Session Details:`);
    logger.info('Success:', sessionResult.success);

    if (sessionResult.success && sessionResult.sessionScopes) {
      const chainIds = this.getEVMChainIdsFromSession(sessionResult);
      logger.info('EVM Chains:', chainIds.length);

      chainIds.forEach((chainId) => {
        const scope = this.getEIP155Scope(chainId);
        const scopeData = sessionResult.sessionScopes?.[scope];
        const networkName = this.getNetworkName(chainId);
        logger.info(
          `  • ${networkName} (${scope}): ${
            scopeData?.accounts?.length || 0
          } accounts`,
        );
      });
    }
    logger.info('');
  }
}
