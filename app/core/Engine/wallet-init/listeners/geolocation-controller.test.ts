import {
  UNKNOWN_LOCATION,
  type GeolocationController,
} from '@metamask/geolocation-controller';
import { fetchInitialGeolocation } from './geolocation-controller';

function buildGeolocationController(location: string) {
  return {
    state: { location },
    getGeolocation: jest.fn().mockResolvedValue('US'),
  } as unknown as jest.Mocked<GeolocationController>;
}

describe('fetchInitialGeolocation', () => {
  it('fetches geolocation when the location is unknown', () => {
    const controller = buildGeolocationController(UNKNOWN_LOCATION);

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).toHaveBeenCalledTimes(1);
  });

  it('fetches geolocation when the location is empty', () => {
    const controller = buildGeolocationController('');

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).toHaveBeenCalledTimes(1);
  });

  it('skips the fetch when the hydrated state already has a known location', () => {
    const controller = buildGeolocationController('US');

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).not.toHaveBeenCalled();
  });

  it('swallows fetch errors', async () => {
    const controller = buildGeolocationController(UNKNOWN_LOCATION);
    controller.getGeolocation.mockRejectedValue(new Error('network'));

    expect(() => fetchInitialGeolocation(controller)).not.toThrow();
    await Promise.resolve();
  });
});
