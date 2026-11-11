import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

import {
  BUNDLED_PROFILE_PUBLIC_KEYS,
  ProfileDocumentValidationError,
  SUPPORTED_DSL,
  verifyProfileDocument,
  type ProfileKeys,
  type SigningProfile,
} from './venueSigningProfiles';
import bundledDocument from './venue-profiles/kalshi-trading-1.json';

/**
 * The bundled document, re-signed per test. Every payload-validation rule is
 * driven through `verifyProfileDocument` because that is the only door a
 * remote profile comes through: a forged-but-signed document is exactly the
 * input the rules exist to refuse.
 */

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64');

/** A test-only key pair standing in for the bundled primary. */
const PRIVATE_KEY = p256.utils.randomSecretKey();
const PUBLIC_POINT = p256.getPublicKey(PRIVATE_KEY, false);

/** The SPKI DER wrapper for a raw uncompressed P-256 point, so `pemToRawPoint`
 * takes the same path the real keys do. Layout, which the parser checks:
 * SEQUENCE(2) + ALGORITHM(21) + BIT STRING tag+len+unused(3) + point(65). */
const toPem = (point: Uint8Array): string => {
  const algorithm = [
    0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06,
    0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ];
  const body = [...algorithm, 0x03, 0x42, 0x00, ...point];
  const der = Uint8Array.from([0x30, body.length, ...body]);
  return `-----BEGIN PUBLIC KEY-----\n${Buffer.from(der).toString(
    'base64',
  )}\n-----END PUBLIC KEY-----`;
};

const KEYS: ProfileKeys = { primary: toPem(PUBLIC_POINT), backup: undefined };

/** Narrow the bundled document once, so the rest of the file reads checked
 * values instead of casting at each use. */
const bundledEnvelope = bundledDocument;
if (typeof bundledEnvelope.payload !== 'string') {
  throw new Error('bundled profile document carries no payload');
}

const bundledPayload = JSON.parse(
  Buffer.from(bundledEnvelope.payload, 'base64').toString('utf8'),
) as Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sign = (payloadObject: unknown): string => {
  const payload = toBase64(
    new TextEncoder().encode(JSON.stringify(payloadObject)),
  );
  const digest = sha256(new TextEncoder().encode(payload));
  const signature = p256.sign(digest, PRIVATE_KEY, { lowS: true });
  return JSON.stringify({
    payload,
    signature: toBase64(signature.toBytes('compact')),
    keyId: 'primary',
  });
};

const verify = (
  payloadObject: unknown,
  raw?: string,
): Promise<SigningProfile> =>
  verifyProfileDocument({
    raw: raw ?? sign(payloadObject),
    keys: KEYS,
    lastAcceptedVersion: 0,
    minDslSupported: SUPPORTED_DSL,
  });

/** The bundled payload with one nested field replaced. */
const withPayload = (
  replace: (copy: Record<string, unknown>) => void,
): Record<string, unknown> => {
  const copy = JSON.parse(JSON.stringify(bundledPayload));
  replace(copy);
  return copy;
};

const codeOf = async (run: Promise<unknown>): Promise<string | undefined> => {
  try {
    await run;
  } catch (error) {
    return error instanceof ProfileDocumentValidationError
      ? error.code
      : 'not-a-validation-error';
  }
  return undefined;
};

describe('verifyProfileDocument accepts the bundled shape', () => {
  it('verifies a document this build signed and supports', async () => {
    await expect(verify(bundledPayload)).resolves.toMatchObject({
      id: 'kalshi-demo-signing',
      version: 2,
      minDsl: 'dsl-1',
    });
  });
});

describe('verifyProfileDocument envelope refusals', () => {
  it.each([
    ['not JSON at all', '{'],
    ['a JSON array', '[]'],
    ['a JSON null', 'null'],
  ])('refuses %s', async (_label, raw) => {
    expect(await codeOf(verify(bundledPayload, raw))).toBe(
      'profile_document_malformed',
    );
  });

  it.each([
    ['a missing payload', { signature: '', keyId: 'primary' }],
    ['an unknown keyId', { payload: 'x', signature: 'x', keyId: 'tertiary' }],
    ['an empty signature', { payload: 'x', signature: '', keyId: 'primary' }],
  ])('refuses an envelope with %s', async (_label, envelope) => {
    expect(await codeOf(verify(bundledPayload, JSON.stringify(envelope)))).toBe(
      'profile_document_malformed',
    );
  });

  it('refuses a payload over the document byte limit', async () => {
    const raw = JSON.stringify({
      payload: 'a'.repeat(64 * 1024 + 1),
      signature: 'a'.repeat(88),
      keyId: 'primary',
    });
    expect(await codeOf(verify(bundledPayload, raw))).toBe(
      'profile_document_malformed',
    );
  });

  it('refuses a signature that is not 64 raw bytes', async () => {
    const envelope = JSON.parse(sign(bundledPayload));
    expect(
      await codeOf(
        verify(
          bundledPayload,
          JSON.stringify({ ...envelope, signature: 'AAAA' }),
        ),
      ),
    ).toBe('profile_document_bad_signature');
  });

  it('refuses a signature made by a key the profile does not carry', async () => {
    const other = p256.utils.randomSecretKey();
    const signed = JSON.parse(sign(bundledPayload)) as Record<string, unknown>;
    const payload = signed.payload;
    if (typeof payload !== 'string') {
      throw new Error('sign() produced no payload');
    }
    const digest = sha256(new TextEncoder().encode(payload));
    const foreign = p256.sign(digest, other, { lowS: true });
    const raw = JSON.stringify({
      payload,
      signature: toBase64(foreign.toBytes('compact')),
      keyId: 'primary',
    });

    expect(await codeOf(verify(bundledPayload, raw))).toBe(
      'profile_document_bad_signature',
    );
  });

  it('refuses a keyId the keyring has no key for', async () => {
    const envelope = JSON.parse(sign(bundledPayload)) as Record<
      string,
      unknown
    >;
    const raw = JSON.stringify({ ...envelope, keyId: 'backup' });

    // The bundled ring carries only `primary`, so a valid signature labelled
    // `backup` must still be refused rather than trusted by label.
    expect(await codeOf(verify(bundledPayload, raw))).toBe(
      'profile_document_unknown_key',
    );
  });

  it('refuses a public key that is not a P-256 SPKI point', async () => {
    const keys: ProfileKeys = {
      primary: 'not a pem at all',
      backup: undefined,
    };
    await expect(
      verifyProfileDocument({
        raw: sign(bundledPayload),
        keys,
        lastAcceptedVersion: 0,
        minDslSupported: SUPPORTED_DSL,
      }),
    ).rejects.toMatchObject({ code: 'profile_document_unknown_key' });
  });

  it('refuses a payload that decodes to something that is not JSON', async () => {
    const payload = toBase64(new TextEncoder().encode('not json'));
    const digest = sha256(new TextEncoder().encode(payload));
    const signature = p256.sign(digest, PRIVATE_KEY, { lowS: true });
    const raw = JSON.stringify({
      payload,
      signature: toBase64(signature.toBytes('compact')),
      keyId: 'primary',
    });

    expect(await codeOf(verify(bundledPayload, raw))).toBe(
      'profile_document_invalid_payload',
    );
  });

  it('refuses a version below the last one accepted', async () => {
    await expect(
      verifyProfileDocument({
        raw: sign(bundledPayload),
        keys: KEYS,
        lastAcceptedVersion: 3,
        minDslSupported: SUPPORTED_DSL,
      }),
    ).rejects.toMatchObject({ code: 'profile_document_low_version' });
  });

  it('refuses a DSL this build does not implement', async () => {
    await expect(
      verifyProfileDocument({
        raw: sign(bundledPayload),
        keys: KEYS,
        lastAcceptedVersion: 0,
        minDslSupported: ['dsl-2'],
      }),
    ).rejects.toMatchObject({ code: 'profile_document_invalid_payload' });
  });
});

describe('verifyProfileDocument payload refusals', () => {
  const refuse = async (
    replace: (copy: Record<string, unknown>) => void,
  ): Promise<string | undefined> => codeOf(verify(withPayload(replace)));

  it.each([
    [
      'an empty intent list',
      (c: Record<string, unknown>): void => {
        c.intents = [];
      },
    ],
    [
      'an intent that is not an object',
      (c: Record<string, unknown>): void => {
        c.intents = [1];
      },
    ],
    [
      'a payloads map that is not an object',
      (c: Record<string, unknown>): void => {
        c.payloads = [];
      },
    ],
    [
      'a payload the map does not declare',
      (c: Record<string, unknown>): void => {
        c.intents = [
          {
            id: 'x',
            payloads: ['missing'],
            confirm: { kind: 'per-intent', signLimit: 1 },
          },
        ];
      },
    ],
    [
      'a read allowlist that is not a list',
      (c: Record<string, unknown>): void => {
        c.reads = { allow: 'nope' };
      },
    ],
    [
      'an implementation this build does not know',
      (c: Record<string, unknown>): void => {
        const implementation = c.implementation;
        if (typeof implementation !== 'object' || implementation === null) {
          throw new Error('bundled profile carries no implementation');
        }
        Object.defineProperty(implementation, 'id', { value: 'other' });
      },
    ],
  ])('refuses %s', async (_label, replace) => {
    expect(await refuse(replace)).toBe('profile_document_invalid_payload');
  });
});

describe('the bundled keyring', () => {
  it('ships a primary key', () => {
    expect(BUNDLED_PROFILE_PUBLIC_KEYS.primary).toEqual(expect.any(String));
  });
});

/**
 * The shape/source/payload validator tables are the profile's schema. Each
 * row here is a document that is otherwise valid and differs only in the
 * field under test, so a refusal proves that field's rule rather than an
 * earlier one.
 */
describe('verifyProfileDocument schema refusals', () => {
  const refuse = async (
    replace: (copy: Record<string, unknown>) => void,
  ): Promise<string | undefined> => codeOf(verify(withPayload(replace)));

  const payloadNamed = (
    copy: Record<string, unknown>,
    name: string,
  ): Record<string, unknown> => {
    const payloads = copy.payloads;
    if (!isPlainObject(payloads)) {
      throw new Error('bundled profile carries no payload map');
    }
    const payload = payloads[name];
    if (!isPlainObject(payload)) {
      throw new Error(`bundled profile carries no ${name} payload`);
    }
    return payload;
  };

  /** Replaces one source in `create_order`'s body and re-signs. */
  const bodyField = async (
    key: string,
    source: unknown,
  ): Promise<string | undefined> =>
    refuse((copy) => {
      const payload = payloadNamed(copy, 'create_order');
      const body = payload.body;
      if (!isPlainObject(body) || !Array.isArray(body.json)) {
        throw new Error('create_order carries no body fields');
      }
      const field = body.json.find(
        (entry: unknown) => isPlainObject(entry) && entry.key === key,
      );
      if (!isPlainObject(field)) {
        throw new Error(`create_order carries no ${key} field`);
      }
      field.value = source;
    });

  it.each([
    [
      'a source that is not an object',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = 'not-a-source';
      },
    ],
    [
      'a source name that is empty',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = { input: '' };
      },
    ],
    [
      'a transform this build does not implement',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          transform: 'uppercase',
        };
      },
    ],
    [
      'a shape this build does not know',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'not-a-kind' },
        };
      },
    ],
    [
      'a shape whose kind is not an object',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: 'opaque',
        };
      },
    ],
    [
      'an opaque shape with no length bound',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'opaque' },
        };
      },
    ],
    [
      'a decimal shape with a zero scale',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'decimal', scale: 0 },
        };
      },
    ],
    [
      'an int shape with a non-numeric bound',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'int', min: 'zero' },
        };
      },
    ],
    [
      'a oneOf shape whose values are not scalars',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'oneOf', values: [{}] },
        };
      },
    ],
    [
      'a time shape with an unknown unit',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: {
            kind: 'time',
            unit: 'minutes',
            maxAgeSec: 60,
            maxAheadSec: 60,
          },
        };
      },
    ],
    [
      'an array shape over an invalid element shape',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          input: 'idempotencyKey',
          shape: { kind: 'array', of: { kind: 'nope' }, maxItems: 2 },
        };
      },
    ],
    [
      'a map source with an empty input list',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          map: { inputs: [], table: { a: 'b' } },
        };
      },
    ],
    [
      'a map source whose table value is not a string',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = {
          map: { inputs: ['action'], table: { buy: 1 } },
        };
      },
    ],
    [
      'a value source with an empty name',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = { value: '' };
      },
    ],
    [
      'a source that is none of the four kinds',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').idempotencyKey = { unknown: 'x' };
      },
    ],
  ])('refuses %s', async (_label, replace) => {
    expect(await refuse(replace)).toBe('profile_document_invalid_payload');
  });

  it.each([
    [
      'a method other than GET or POST',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').method = 'DELETE';
      },
    ],
    [
      'a path outside the path grammar',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').path = '/trade api/orders';
      },
    ],
    [
      'path params that are not a source map',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').pathParams = { id: 'not-a-source' };
      },
    ],
    [
      'a query entry with no key',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').query = [
          { key: '', value: { const: 'x' } },
        ];
      },
    ],
    [
      'a query flag that is not a boolean',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').query = [
          { key: 'x', value: { const: 'v' }, optional: 'yes' },
        ];
      },
    ],
    [
      'a body that is not a field list',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').body = { json: 'nope', maxBytes: 1 };
      },
    ],
    [
      'an empty body field list',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').body = { json: [], maxBytes: 1 };
      },
    ],
    [
      'a body byte limit of zero',
      (c: Record<string, unknown>): void => {
        const body = payloadNamed(c, 'create_order').body;
        if (!isPlainObject(body)) {
          throw new Error('create_order carries no body');
        }
        body.maxBytes = 0;
      },
    ],
    [
      'an invariant this build does not implement',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').invariants = [
          { implementation: 'position-averaging-v9' },
        ];
      },
    ],
    [
      'an invariant whose params are not an object',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').invariants = [
          { implementation: 'binary-limit-order-v1', params: 'flat' },
        ];
      },
    ],
    [
      'a payload kind this build does not know',
      (c: Record<string, unknown>): void => {
        payloadNamed(c, 'create_order').kind = 'graphql';
      },
    ],
  ])('refuses %s', async (_label, replace) => {
    expect(await refuse(replace)).toBe('profile_document_invalid_payload');
  });

  it('accepts a body field whose source is a valid shape', async () => {
    await expect(
      bodyField('count', {
        input: 'count',
        shape: { kind: 'decimal', scale: 2 },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts declared-but-opaque payload kinds', async () => {
    // `eip712` / `evm-calls` are declared for other renderers; loading one
    // must succeed so a future venue can ship one without a new build.
    await expect(
      refuse((c) => {
        const payload = payloadNamed(c, 'create_order');
        payload.kind = 'eip712';
      }),
    ).resolves.toBeUndefined();
  });
});
