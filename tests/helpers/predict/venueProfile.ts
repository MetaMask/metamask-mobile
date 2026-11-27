import { RemoteVenueProfileClient } from '../../../app/components/UI/PredictNext/auth/RemoteVenueProfileClient';
import { VENUE_PROFILE_ID } from '../../../app/components/UI/PredictNext/auth/venueProfileContract';
import { VenueProfileStore } from '../../../app/components/UI/PredictNext/auth/venueProfileStore';
import {
  setVenueProfileResolverForTesting,
  VenueProfileResolver,
  type VenueProfileResolverOptions,
} from '../../../app/components/UI/PredictNext/auth/venueSigningProfiles';
import {
  TEST_VENUE_PROFILE_RAW,
  TEST_VENUE_REVOKED_RAW,
} from '../../fixtures/predict/venueProfiles';

/** Installs a fresh cached profile and an isolated registry response. */
export const installVenueProfileFixture = (
  options: {
    cached?: boolean;
    client?: RemoteVenueProfileClient;
    getSigningProfile?: VenueProfileResolverOptions['getSigningProfile'];
  } = {},
): VenueProfileResolver => {
  let cached: string | null =
    options.cached === false
      ? null
      : JSON.stringify({
          targetVersion: 1,
          revokedRaw: TEST_VENUE_REVOKED_RAW,
          profiles: { '1': TEST_VENUE_PROFILE_RAW },
          floor: 1,
          fetchedAt: Date.now(),
        });
  const fetchFixture: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const body = url.endsWith('/revoked')
      ? TEST_VENUE_REVOKED_RAW
      : TEST_VENUE_PROFILE_RAW;
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    } as unknown as Response;
  };
  const resolver = new VenueProfileResolver({
    client:
      options.client ??
      new RemoteVenueProfileClient({
        baseUrl: 'https://registry.example/',
        clientVersion: 'test',
        fetch: fetchFixture,
      }),
    store: new VenueProfileStore({
      environment: 'dev',
      profileId: VENUE_PROFILE_ID,
      storage: {
        getItem: async () => cached,
        setItem: async (_key, value) => {
          cached = value;
        },
        removeItem: async () => {
          cached = null;
        },
      },
    }),
    getSigningProfile:
      options.getSigningProfile ??
      (async () => ({ id: VENUE_PROFILE_ID, version: 1 })),
  });
  setVenueProfileResolverForTesting(resolver);
  return resolver;
};
