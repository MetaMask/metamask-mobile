import { getDeviceCapabilityOverride } from '../../../util/deviceCapability/override';
import { withNetworkConditions } from './withNetworkConditions';

it('scopes nested overrides and restores the outer override on rejection', async () => {
  const initialDev = __DEV__;
  const failure = new Error('fixture');

  await withNetworkConditions({ network: 'WIFI' }, async () => {
    await expect(
      withNetworkConditions({ network: 'NONE' }, () => {
        expect(getDeviceCapabilityOverride()).toEqual({ network: 'NONE' });
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(getDeviceCapabilityOverride()).toEqual({ network: 'WIFI' });
  });

  expect(__DEV__).toBe(initialDev);
});
