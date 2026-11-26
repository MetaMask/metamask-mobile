import {
  applyVenueProfileCeiling,
  type VenueProfileCeilingReason,
} from './venueProfileCeiling';
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

interface HostileProfile {
  intents: {
    id: string;
    payloads: string[];
    invariant?: string;
    confirm: { signLimit: number };
  }[];
  payloads: Record<
    string,
    {
      kind: string;
      method: string;
      path: string;
      body: { json: { key: string; value: Record<string, unknown> }[] };
      invariants: { implementation: string; params: Record<string, unknown> }[];
    }
  >;
  implementation: { params: Record<string, unknown> };
}

const hostileVariants: {
  name: string;
  reason: VenueProfileCeilingReason;
  mutate: (profile: HostileProfile) => void;
}[] = [
  {
    name: 'funding deposit posting orders',
    reason: 'invalid_payload_contract',
    mutate: (profile) => {
      profile.payloads.crypto_deposit_address.path =
        '/trade-api/v2/portfolio/events/orders';
    },
  },
  {
    name: 'an extra intent payload',
    reason: 'invalid_payload_contract',
    mutate: (profile) => {
      profile.intents[0].payloads.push('wallet_register');
    },
  },
  {
    name: 'an opaque intent payload',
    reason: 'invalid_payload_contract',
    mutate: (profile) => {
      profile.payloads.wallet_register.kind = 'eip712';
    },
  },
  {
    name: 'a GET intent payload',
    reason: 'invalid_payload_contract',
    mutate: (profile) => {
      profile.payloads.wallet_register.method = 'GET';
    },
  },
  {
    name: 'a decoy price field',
    reason: 'invalid_order_invariant_params',
    mutate: (profile) => {
      profile.payloads.create_order.invariants[0].params.priceField = 'decoy';
    },
  },
  {
    name: 'a const added to price',
    reason: 'invalid_body_contract',
    mutate: (profile) => {
      const price = profile.payloads.create_order.body.json.find(
        (field) => field.key === 'price',
      );
      if (!price) {
        throw new Error('fixture price missing');
      }
      price.value.const = 99;
    },
  },
  {
    name: 'a zero fee ceiling',
    reason: 'invalid_order_invariant_params',
    mutate: (profile) => {
      profile.payloads.create_order.invariants[0].params.feeCeilingCentsPerContract = 0;
    },
  },
  {
    name: 'extra order invariant params',
    reason: 'invalid_order_invariant_params',
    mutate: (profile) => {
      profile.payloads.create_order.invariants[0].params.extra = 'ignored';
    },
  },
  {
    name: 'an hour-long signature lifetime',
    reason: 'invalid_implementation_params',
    mutate: (profile) => {
      profile.implementation.params.lifetimeSec = 3600;
    },
  },
  {
    name: 'one hundred signatures',
    reason: 'invalid_implementation_params',
    mutate: (profile) => {
      profile.implementation.params.maxSignatures = 100;
    },
  },
  {
    name: 'a const funding deposit body field',
    reason: 'invalid_body_contract',
    mutate: (profile) => {
      profile.payloads.crypto_deposit_address.body.json[0].value = {
        const: 100,
      };
    },
  },
  {
    name: 'ten signatures per confirmation',
    reason: 'invalid_sign_limit',
    mutate: (profile) => {
      profile.intents[0].confirm.signLimit = 10;
    },
  },
  {
    name: 'a missing order intent invariant',
    reason: 'missing_order_invariant',
    mutate: (profile) => {
      delete profile.intents[0].invariant;
    },
  },
  {
    name: 'a wrong order intent invariant',
    reason: 'missing_order_invariant',
    mutate: (profile) => {
      profile.intents[0].invariant = 'different';
    },
  },
  {
    name: 'a wrong order payload invariant',
    reason: 'missing_order_invariant',
    mutate: (profile) => {
      profile.payloads.create_order.invariants[0].implementation = 'different';
    },
  },
  {
    name: 'an extra order body field',
    reason: 'invalid_body_contract',
    mutate: (profile) => {
      profile.payloads.create_order.body.json.push({
        key: 'decoy',
        value: { value: 'price' },
      });
    },
  },
  {
    name: 'a missing activation body field',
    reason: 'invalid_body_contract',
    mutate: (profile) => {
      profile.payloads.wallet_register.body.json.pop();
    },
  },
  {
    name: 'a different signing authority',
    reason: 'invalid_implementation_params',
    mutate: (profile) => {
      profile.implementation.params.authority = 'evil.example';
    },
  },
  ...['price', 'count'].map((key) => ({
    name: `an input source for ${key}`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads.create_order.body.json.find(
        (entry) => entry.key === key,
      );
      if (!field) {
        throw new Error(`fixture ${key} missing`);
      }
      field.value = { input: key };
    },
  })),
  ...(
    [
      [
        'ticker',
        { input: 'amountCents', shape: { kind: 'opaque', maxLength: 256 } },
      ],
      ['client_order_id', { input: 'marketId', shape: { kind: 'uuid-v4' } }],
    ] as [string, Record<string, unknown>][]
  ).map(([key, value]) => ({
    name: `a redirected ${key} input`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads.create_order.body.json.find(
        (entry) => entry.key === key,
      );
      if (!field) {
        throw new Error(`fixture ${key} missing`);
      }
      field.value = value;
    },
  })),
  ...['wallet_address', 'network'].map((key) => ({
    name: `a redirected ${key} input`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads.wallet_register.body.json.find(
        (entry) => entry.key === key,
      );
      if (!field) {
        throw new Error(`fixture ${key} missing`);
      }
      field.value = { input: key === 'network' ? 'walletAddress' : 'network' };
    },
  })),
  {
    name: 'a redirected deposit amount',
    reason: 'invalid_body_contract',
    mutate: (profile) => {
      profile.payloads.crypto_deposit_address.body.json[0].value = {
        input: 'contracts',
      };
    },
  },
  ...['price', 'count'].map((key) => ({
    name: `a loosened ${key} shape`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads.create_order.body.json.find(
        (entry) => entry.key === key,
      );
      if (!field) {
        throw new Error(`fixture ${key} missing`);
      }
      field.value = { value: key, shape: { kind: 'decimal', scale: 4 } };
    },
  })),
  ...(
    [
      ['create_order', 'ticker', 'side'],
      ['wallet_register', 'wallet_address', 'network'],
      ['crypto_deposit_address', 'amount_cents', 'networks'],
    ] as [string, string, string][]
  ).map(([payloadName, dropped, duplicated]) => ({
    name: `a duplicated ${duplicated} field replacing ${dropped}`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads[payloadName].body.json.find(
        (entry) => entry.key === dropped,
      );
      if (!field) {
        throw new Error(`fixture ${dropped} missing`);
      }
      field.key = duplicated;
    },
  })),
  ...['side', 'reduce_only'].map((key) => ({
    name: `a noncanonical ${key} map`,
    reason: 'invalid_body_contract' as const,
    mutate: (profile: HostileProfile) => {
      const field = profile.payloads.create_order.body.json.find(
        (entry) => entry.key === key,
      );
      if (!field) {
        throw new Error(`fixture ${key} missing`);
      }
      field.value = {
        map: { inputs: ['action'], table: { buy: true, sell: false } },
      };
    },
  })),
  ...[0, 1.5, Number.MAX_SAFE_INTEGER + 1].map((signLimit) => ({
    name: `an invalid signature limit ${signLimit}`,
    reason: 'invalid_sign_limit' as const,
    mutate: (profile: HostileProfile) => {
      profile.intents[0].confirm.signLimit = signLimit;
    },
  })),
  ...[0, 1.5, Number.MAX_SAFE_INTEGER + 1].map((lifetimeSec) => ({
    name: `an invalid lifetime ${lifetimeSec}`,
    reason: 'invalid_implementation_params' as const,
    mutate: (profile: HostileProfile) => {
      profile.implementation.params.lifetimeSec = lifetimeSec;
    },
  })),
  {
    name: 'an extra signing header',
    reason: 'invalid_implementation_params',
    mutate: (profile) => {
      profile.implementation.params.headers = {
        requestId: 'kalshi-device-request-id',
        key: 'kalshi-device-key',
        salt: 'kalshi-device-key-salt',
        extra: 'hostile-header',
      };
    },
  },
];

describe('applyVenueProfileCeiling', () => {
  it('admits the bundled profile', () => {
    expect(applyVenueProfileCeiling(bundled())).toEqual({ ok: true });
  });

  it.each(hostileVariants)('refuses $name', ({ mutate, reason }) => {
    const profile: HostileProfile = JSON.parse(TEST_VENUE_PROFILE_RAW);
    mutate(profile);
    expect(applyVenueProfileCeiling(malformed(profile))).toEqual({
      ok: false,
      reason,
    });
  });

  it('refuses a payload using a future API version', () => {
    expect(
      applyVenueProfileCeiling(
        withPayloadPath('/trade-api/v3/isv/wallet/register'),
      ),
    ).toEqual({ ok: false, reason: 'invalid_payload_contract' });
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
