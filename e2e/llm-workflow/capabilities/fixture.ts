/* eslint-disable import-x/no-nodejs-modules */
import type { FixtureCapability, WalletState } from '@metamask/client-mcp-core';
import { createRequire } from 'node:module';
import type FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import type FixtureServer from '../../../tests/framework/fixtures/FixtureServer';
import type { Fixture } from '../../../tests/framework/fixtures/types';
import { fixtureToWalletState, walletStateToFixture } from './fixture-adapter';

const cjsRequire = createRequire(__filename);

export interface FixtureCapabilityOptions {
  port: number;
}

/**
 * MetaMaskMobileFixtureCapability provides a thin wrapper over the existing
 * mobile fixture infrastructure (FixtureBuilder + FixtureServer).
 */
export class MetaMaskMobileFixtureCapability implements FixtureCapability {
  private server: FixtureServer | undefined;

  private port: number;

  constructor(options: FixtureCapabilityOptions) {
    this.port = options.port;
  }

  /**
   * Start the fixture server with the given wallet state.
   * @param state - The wallet state to load into the fixture server
   */
  async start(state: WalletState): Promise<void> {
    const { default: FixtureServerConstructor } = await import(
      '../../../tests/framework/fixtures/FixtureServer'
    );
    const server = new FixtureServerConstructor();
    server.setServerPort(this.port);
    this.server = server;

    await server.start();

    const fixtureData = walletStateToFixture(state);
    server.loadJsonState(fixtureData, null);
  }

  /**
   * Stop the fixture server.
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
    const FixtureBuilderConstructor = getFixtureBuilderConstructor();
    const fixture = new FixtureBuilderConstructor()
      .withDefaultFixture()
      .build();
    return this.toWalletState(fixture);
  }

  /**
   * Get a fresh onboarding state (no accounts).
   * @returns Onboarding wallet state
   */
  getOnboardingState(): WalletState {
    const FixtureBuilderConstructor = getFixtureBuilderConstructor();
    const fixture = new FixtureBuilderConstructor()
      .withOnboardingFixture()
      .build();
    return this.toWalletState(fixture);
  }

  /**
   * Resolve a preset name to a wallet state.
   * @param presetName - Name of the preset to resolve
   * @returns Wallet state for the given preset
   */
  resolvePreset(presetName: string): WalletState {
    const FixtureBuilderConstructor = getFixtureBuilderConstructor();
    const builder = new FixtureBuilderConstructor();

    switch (presetName) {
      case 'default':
        return this.toWalletState(builder.withDefaultFixture().build());

      case 'onboarding':
        return this.toWalletState(builder.withOnboardingFixture().build());

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
        return this.toWalletState(
          builderWithDefault
            .withTokensForAllPopularNetworks(sampleTokens)
            .build(),
        );
      }

      case 'with-popular-networks': {
        const builderWithDefault = builder.withDefaultFixture();
        return this.toWalletState(
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

  private toWalletState(fixture: Fixture): WalletState {
    return fixtureToWalletState(fixture);
  }
}

function getFixtureBuilderConstructor(): typeof FixtureBuilder {
  const fixtureBuilderModule = cjsRequire(
    '../../../tests/framework/fixtures/FixtureBuilder',
  ) as { default: typeof FixtureBuilder };

  return fixtureBuilderModule.default;
}
