import { applyVenueProfileCeiling } from './venueProfileCeiling';
import {
  validateSigningProfile,
  type SigningProfile,
} from './venueSigningProfiles';
import { TEST_VENUE_PROFILE_RAW } from '../../../../../tests/fixtures/predict/venueProfiles';

const bundled = (): SigningProfile => {
  const profile = validateSigningProfile(JSON.parse(TEST_VENUE_PROFILE_RAW));
  if (!profile) {
    throw new Error('bundled profile is invalid');
  }
  return profile;
};

const malformed = (value: object): SigningProfile =>
  value as unknown as SigningProfile;

const withPayloadPath = (path: string): SigningProfile => {
  const profile = bundled();
  return {
    ...profile,
    payloads: {
      ...profile.payloads,
      wallet_register: {
        ...(profile.payloads.wallet_register as object),
        path,
      },
    },
  } as unknown as SigningProfile;
};

describe('applyVenueProfileCeiling', () => {
  it('admits the bundled profile', () => {
    expect(applyVenueProfileCeiling(bundled())).toEqual({ ok: true });
  });

  it('admits a payload using a future API version', () => {
    expect(
      applyVenueProfileCeiling(
        withPayloadPath('/trade-api/v3/isv/wallet/register'),
      ),
    ).toEqual({ ok: true });
  });

  it('admits a read using a future API version', () => {
    const profile = bundled();
    expect(
      applyVenueProfileCeiling({
        ...profile,
        reads: {
          ...profile.reads,
          allow: [{ method: 'GET', path: '/trade-api/v3/portfolio/balance' }],
        },
      }),
    ).toEqual({ ok: true });
  });

  it('refuses a payload with only a matching prefix fragment', () => {
    expect(
      applyVenueProfileCeiling(withPayloadPath('/trade-api-other/v3/register')),
    ).toEqual({ ok: false, reason: 'foreign_path' });
  });

  it('refuses a read with only a matching prefix fragment', () => {
    const profile = bundled();
    expect(
      applyVenueProfileCeiling({
        ...profile,
        reads: {
          ...profile.reads,
          allow: [{ method: 'GET', path: '/trade-api-other/v3/balance' }],
        },
      }),
    ).toEqual({ ok: false, reason: 'foreign_path' });
  });

  it('refuses another profile id', () => {
    expect(applyVenueProfileCeiling({ ...bundled(), id: 'other' })).toEqual({
      ok: false,
      reason: 'wrong_id',
    });
  });

  it('refuses another venue', () => {
    expect(
      applyVenueProfileCeiling({ ...bundled(), venue: 'polymarket' }),
    ).toEqual({ ok: false, reason: 'wrong_venue' });
  });

  it('refuses a DSL this build does not render', () => {
    expect(
      applyVenueProfileCeiling(malformed({ ...bundled(), minDsl: 'dsl-2' })),
    ).toEqual({ ok: false, reason: 'unsupported_dsl' });
  });

  it('refuses an intent this build does not sign', () => {
    const profile = bundled();
    expect(
      applyVenueProfileCeiling(
        malformed({
          ...profile,
          intents: [
            ...profile.intents,
            { id: 'order.cancel', payloads: ['wallet_register'] },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: 'unknown_intent' });
  });

  it('refuses a payload path outside the venue API', () => {
    expect(
      applyVenueProfileCeiling(withPayloadPath('/elsewhere/register')),
    ).toEqual({
      ok: false,
      reason: 'foreign_path',
    });
  });

  it('refuses a read outside the venue API', () => {
    const profile = bundled();
    expect(
      applyVenueProfileCeiling({
        ...profile,
        reads: {
          ...profile.reads,
          allow: [
            ...profile.reads.allow,
            { method: 'GET', path: '/internal/x' },
          ],
        },
      }),
    ).toEqual({ ok: false, reason: 'foreign_path' });
  });

  it('refuses an order payload without the confirmation invariant', () => {
    const profile = bundled();
    expect(
      applyVenueProfileCeiling(
        malformed({
          ...profile,
          payloads: {
            ...profile.payloads,
            create_order: {
              ...(profile.payloads.create_order as object),
              invariants: [],
            },
          },
        }),
      ),
    ).toEqual({ ok: false, reason: 'missing_order_invariant' });
  });
});
