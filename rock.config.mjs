/* eslint-disable import/no-default-export */

// @ts-nocheck - Rock CLI packages only available in CI environment
import { platformIOS } from '@rock-js/platform-ios';
import { pluginMetro } from '@rock-js/plugin-metro';
import { providerGitHub } from '@rock-js/provider-github';

/** @type {import('rock').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS({
      scheme: 'MetaMask',
      configuration: 'Release',
    }),
  },
  remoteCacheProvider: providerGitHub({
    owner: 'MetaMask',
    repo: 'metamask-mobile',
  }),
  fingerprint: {
    extraSources: [
      'METAMASK_ENVIRONMENT',
      'METAMASK_BUILD_TYPE',
      'E2E',
    ],
  },
};

