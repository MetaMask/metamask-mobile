import {
  loadVenueProfile,
  resetVenueProfile,
  validateSigningProfile,
  type HttpRfc9421Payload,
  type SigningProfile,
} from './venueSigningProfiles';
import {
  BUNDLED_V2_RAW,
  BUNDLED_V3_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';
import {
  renderRequest,
  TemplateError,
  type RenderedRequest,
  type RequestTemplate,
  type TemplateInputs,
} from './signing/profileTemplates';

const CLIENT_OPERATION_ID = '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f';

const parseBundled = (raw: string): SigningProfile => {
  const profile = validateSigningProfile(JSON.parse(raw));
  if (!profile) {
    throw new Error('bundled profile is invalid');
  }
  return profile;
};

const v2 = parseBundled(BUNDLED_V2_RAW);
const v3 = parseBundled(BUNDLED_V3_RAW);

afterEach(() => {
  resetVenueProfile();
});

/** The template `PredictDeviceAuthService` renders a mutation payload from. */
const depositTemplate = (profile: SigningProfile): RequestTemplate => {
  const payload = profile.payloads.crypto_deposit_address as HttpRfc9421Payload;
  return {
    class: 'mutation',
    method: payload.method,
    path: payload.path,
    body: payload.body,
    idempotencyKey: payload.idempotencyKey,
    invariants: payload.invariants,
  };
};

const renderDeposit = (inputs: TemplateInputs): RenderedRequest =>
  renderRequest('crypto_deposit_address', depositTemplate(v3), {
    inputs,
    values: {},
    nowMs: 0,
  });

describe('bundled signing profile documents', () => {
  it('parses both bundled byte copies', () => {
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
  });

  it('signs with version 3', async () => {
    const profile = await loadVenueProfile();

    expect(profile).toMatchObject({ id: v3.id, version: 3 });
  });

  it('keeps every version 2 intent and payload unchanged in version 3', () => {
    const v3Intents = v3.intents.filter(
      (intent) => intent.id !== 'funding.deposit',
    );
    const { crypto_deposit_address: deposit, ...v3Payloads } = v3.payloads;

    expect(v3Intents).toStrictEqual(v2.intents);
    expect(v3Payloads).toStrictEqual(v2.payloads);
    expect(v3.reads).toStrictEqual(v2.reads);
    expect(v3.implementation).toStrictEqual(v2.implementation);
    expect(deposit).toBeDefined();
  });

  it('declares funding.deposit with the crypto deposit address payload', () => {
    const intent = v3.intents.find(({ id }) => id === 'funding.deposit');

    expect(intent).toStrictEqual({
      id: 'funding.deposit',
      payloads: ['crypto_deposit_address'],
      confirm: { kind: 'per-intent', signLimit: 3 },
    });
    expect(v2.intents.map(({ id }) => id)).not.toContain('funding.deposit');
  });
});

describe('crypto_deposit_address rendering', () => {
  it('renders the address request body with the array input', () => {
    const rendered = renderDeposit({
      amountCents: 2550,
      networks: ['base'],
      clientOperationId: CLIENT_OPERATION_ID,
    });

    expect(rendered).toMatchObject({
      method: 'POST',
      path: '/trade-api/v2/isv/deposit/crypto-addresses',
      query: '',
      body: '{"amount_cents":2550,"networks":["base"]}',
      idempotencyKey: CLIENT_OPERATION_ID,
    });
  });

  it('renders a different body for a different amount', () => {
    const inputs = {
      networks: ['base'],
      clientOperationId: CLIENT_OPERATION_ID,
    };

    expect(renderDeposit({ ...inputs, amountCents: 2550 }).body).not.toBe(
      renderDeposit({ ...inputs, amountCents: 2551 }).body,
    );
  });

  it.each([
    ['a network outside the profile', { networks: ['ethereum'] }, 'shape'],
    [
      'more networks than the profile allows',
      { networks: ['base', 'base'] },
      'shape',
    ],
    ['an empty network', { networks: [''] }, 'shape'],
    ['networks that are not an array', { networks: 'base' }, 'shape'],
    ['an amount under one dollar', { amountCents: 99 }, 'shape'],
    ['an amount that is not whole cents', { amountCents: 25.5 }, 'shape'],
    ['an amount as a string', { amountCents: '2550' }, 'shape'],
    [
      'an idempotency key that is not a UUID v4',
      { clientOperationId: 'not-a-uuid' },
      'idempotency_key',
    ],
  ] as const)('refuses %s', (_name, override, rule) => {
    const inputs = {
      amountCents: 2550,
      networks: ['base'],
      clientOperationId: CLIENT_OPERATION_ID,
      ...override,
    } as TemplateInputs;

    expect(() => renderDeposit(inputs)).toThrow(TemplateError);
    expect(() => renderDeposit(inputs)).toThrow(
      expect.objectContaining({ rule }),
    );
  });

  it.each(['amountCents', 'networks', 'clientOperationId'])(
    'refuses a missing %s',
    (name) => {
      const inputs: Record<string, unknown> = {
        amountCents: 2550,
        networks: ['base'],
        clientOperationId: CLIENT_OPERATION_ID,
      };
      delete inputs[name];

      expect(() => renderDeposit(inputs as TemplateInputs)).toThrow(
        expect.objectContaining({ rule: 'input' }),
      );
    },
  );
});
