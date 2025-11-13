import { TestSpecificMock } from '../../framework/types';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder';
import { setupMockRequest } from '../helpers/mockHelpers';
import { createGeolocationResponse } from './ramps/ramps-geolocation';
import { RAMPS_NETWORKS_RESPONSE } from './ramps/ramps-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { setupRemoteFeatureFlagsMock } from '../helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagCardExperimentalSwitch2Enabled,
  remoteFeatureFlagCardFeature,
  remoteFeatureFlagDisplayCardButtonEnabled,
} from './feature-flags-mocks';

export const testSpecificMock: TestSpecificMock = async (mockServer) => {
  // Geolocation mocks - set to Spain (all envs)
  for (const mock of createGeolocationResponse(
    RampsRegions[RampsRegionsEnum.SPAIN],
  )) {
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: mock.urlEndpoint,
      response: mock.response,
      responseCode: mock.responseCode,
    });
  }

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/networks\?.*$/,
    response: RAMPS_NETWORKS_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
    response: RAMPS_NETWORKS_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/accounts\.api\.cx\.metamask\.io\/v1\/metadata\?.*$/,
    response: {
      is: [`eip155:0:${DEFAULT_FIXTURE_ACCOUNT.toLowerCase()}`],
    },
    responseCode: 200,
  });

  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign(
      {},
      remoteFeatureFlagDisplayCardButtonEnabled(true),
      remoteFeatureFlagCardExperimentalSwitch2Enabled(true),
      remoteFeatureFlagCardFeature(),
      {
        depositConfig: {
          active: true,
          entrypoints: {
            walletActions: true,
          },
          minimumVersion: '1.0.0',
          providerApiKey: 'DUMMY_VALUE',
          providerFrontendAuth: 'DUMMY_VALUE',
        },
      },
    ),
  );
};
