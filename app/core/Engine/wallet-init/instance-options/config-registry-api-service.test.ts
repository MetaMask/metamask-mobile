import { ConfigRegistryApiEnv } from '@metamask/config-registry-controller';
import { getConfigRegistryApiServiceInstanceOptions } from './config-registry-api-service';

describe('getConfigRegistryApiServiceInstanceOptions', () => {
  it('builds options with production env and fetch', () => {
    const options = getConfigRegistryApiServiceInstanceOptions();

    expect(options).toEqual({
      env: ConfigRegistryApiEnv.PRD,
      fetch,
    });
  });
});
