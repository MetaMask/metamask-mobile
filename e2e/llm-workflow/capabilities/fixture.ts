import type { FixtureCapability, WalletState } from '@metamask/client-mcp-core';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import FixtureServer from '../../../tests/framework/fixtures/FixtureServer';
import PortManager, {
  ResourceType,
} from '../../../tests/framework/PortManager';

/**
 * MetaMaskMobileFixtureCapability provides a thin wrapper over the existing
 * mobile fixture infrastructure (FixtureBuilder + FixtureServer).
 *
 * This capability enables LLM-driven E2E testing by managing wallet state fixtures
 * through a standardized interface compatible with @metamask/client-mcp-core.
 */
export class MetaMaskMobileFixtureCapability implements FixtureCapability {
  private server: FixtureServer | undefined;

  /**
   * Start the fixture server with the given wallet state.
   * @param state - The wallet state to load into the fixture server
   */
  async start(state: WalletState): Promise<void> {
    console.log('Starting FixtureServer...');

    const portManager = PortManager.getInstance();
    const allocatedPort = await portManager.allocatePort(
      ResourceType.FIXTURE_SERVER,
    );

    const server = new FixtureServer();
    server.setServerPort(allocatedPort.port);
    this.server = server;

    await server.start();

    const fixtureData = {
      state: state.data,
      asyncState: state.meta || {},
    };
    server.loadJsonState(fixtureData as unknown as FixtureBuilder, null);

    console.log(`FixtureServer running on port ${allocatedPort.port}`);
  }

  /**
   * Stop the fixture server and release resources.
   */
  async stop(): Promise<void> {
    const { server } = this;
    if (!server) {
      return;
    }

    await server.stop();
    this.server = undefined;
  }

  /**
   * Get the default onboarded wallet state.
   * @returns Default wallet state with a single account
   */
  getDefaultState(): WalletState {
    const fixture = new FixtureBuilder().withDefaultFixture().build();
    return this.fixtureToWalletState(fixture);
  }

  /**
   * Get a fresh onboarding state (no accounts).
   * @returns Onboarding wallet state
   */
  getOnboardingState(): WalletState {
    const fixture = new FixtureBuilder().withOnboardingFixture().build();
    return this.fixtureToWalletState(fixture);
  }

  /**
   * Resolve a preset name to a wallet state.
   * @param presetName - Name of the preset to resolve
   * @returns Wallet state for the given preset
   */
  resolvePreset(presetName: string): WalletState {
    const builder = new FixtureBuilder();

    switch (presetName) {
      case 'default':
        return this.fixtureToWalletState(builder.withDefaultFixture().build());

      case 'onboarding':
        return this.fixtureToWalletState(
          builder.withOnboardingFixture().build(),
        );

      case 'with-tokens': {
        const builderWithDefault = builder.withDefaultFixture();
        const sampleTokens = [
          {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            symbol: 'DAI',
            decimals: 18,
            name: 'Dai Stablecoin',
          },
        ];
        return this.fixtureToWalletState(
          builderWithDefault
            .withTokensForAllPopularNetworks(sampleTokens)
            .build(),
        );
      }

      case 'with-popular-networks': {
        const builderWithDefault = builder.withDefaultFixture();
        return this.fixtureToWalletState(
          builderWithDefault.withPopularNetworks().build(),
        );
      }

      default:
        throw new Error(
          `Unknown fixture preset: ${presetName}. ` +
            `Available presets: default, onboarding, with-tokens, with-popular-networks`,
        );
    }
  }

  /**
   * Convert FixtureBuilder output to WalletState format.
   * @param fixture - The fixture data from FixtureBuilder
   * @returns WalletState compatible with client-mcp-core
   */
  private fixtureToWalletState(
    fixture: FixtureBuilder['fixture'],
  ): WalletState {
    // FixtureBuilder returns { state, asyncState }
    // WalletState expects { data, meta }
    return {
      data: fixture.state || {},
      meta: fixture.asyncState || {},
    };
  }
}
