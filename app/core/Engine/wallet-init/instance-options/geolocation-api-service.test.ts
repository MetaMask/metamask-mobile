import { Env } from '@metamask/geolocation-controller';
import { getGeolocationApiServiceInstanceOptions } from './geolocation-api-service';
import { getSdkEnvironment } from '../../../../components/UI/Ramp/utils/getSdkEnvironment';
import { SdkEnvironment } from '../../../../components/UI/Ramp/types/legacyDeposit';

jest.mock('../../../../components/UI/Ramp/utils/getSdkEnvironment', () => ({
  getSdkEnvironment: jest.fn(),
}));

const mockGetSdkEnvironment = jest.mocked(getSdkEnvironment);

describe('getGeolocationApiServiceInstanceOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the production geolocation API for the production SDK environment', () => {
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

    const options = getGeolocationApiServiceInstanceOptions();

    expect(options.env).toBe(Env.PRD);
  });

  it('uses the dev geolocation API for the staging SDK environment', () => {
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Staging);

    const options = getGeolocationApiServiceInstanceOptions();

    expect(options.env).toBe(Env.DEV);
  });

  it('passes a fetch function', () => {
    mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

    const options = getGeolocationApiServiceInstanceOptions();

    expect(options.fetch).toStrictEqual(expect.any(Function));
  });
});
