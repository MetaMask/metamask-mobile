import { extractSignatureAddresses } from './extract-signature-addresses';

const ADDR_A = '0x1111111111111111111111111111111111111111';
const ADDR_B = '0x2222222222222222222222222222222222222222';
const ADDR_C = '0x3333333333333333333333333333333333333333';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type Types = Record<string, { name: string; type: string }[]>;

function build(
  primaryType: string,
  types: Types,
  message: Record<string, unknown>,
) {
  return { types, primaryType, message };
}

describe('extractSignatureAddresses', () => {
  it('returns nothing for missing or malformed payloads', () => {
    const empty = { addresses: [], fields: {}, overflow: false };
    expect(extractSignatureAddresses(undefined)).toStrictEqual(empty);
    expect(extractSignatureAddresses(null)).toStrictEqual(empty);
    expect(extractSignatureAddresses({})).toStrictEqual(empty);
    expect(
      extractSignatureAddresses({
        types: {},
        primaryType: 'Missing',
        message: {},
      }),
    ).toStrictEqual(empty);
  });

  it('collects every address-typed field on the primary type', () => {
    const data = build(
      'Transfer',
      {
        Transfer: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
      },
      { to: ADDR_A, value: '1' },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([ADDR_A]);
  });

  it('finds an address regardless of the field name', () => {
    const data = build(
      'ApproveAgent',
      { ApproveAgent: [{ name: 'agentAddress', type: 'address' }] },
      { agentAddress: ADDR_A },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([ADDR_A]);
  });

  it('recurses into nested structs', () => {
    const data = build(
      'Order',
      {
        Order: [{ name: 'consideration', type: 'Item' }],
        Item: [{ name: 'recipient', type: 'address' }],
      },
      { consideration: { recipient: ADDR_A } },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([ADDR_A]);
  });

  it('recurses into arrays of structs', () => {
    const data = build(
      'Order',
      {
        Order: [{ name: 'consideration', type: 'Item[]' }],
        Item: [{ name: 'recipient', type: 'address' }],
      },
      { consideration: [{ recipient: ADDR_A }, { recipient: ADDR_B }] },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([
      ADDR_A,
      ADDR_B,
    ]);
  });

  it('collects flat address arrays', () => {
    const data = build(
      'Batch',
      { Batch: [{ name: 'recipients', type: 'address[]' }] },
      { recipients: [ADDR_A, ADDR_B] },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([
      ADDR_A,
      ADDR_B,
    ]);
  });

  it('excludes the signer and the zero address', () => {
    const data = build(
      'Transfer',
      {
        Transfer: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'burn', type: 'address' },
        ],
      },
      { from: ADDR_A, to: ADDR_B, burn: ZERO_ADDRESS },
    );
    expect(
      extractSignatureAddresses(data, { exclude: [ADDR_A] }).addresses,
    ).toStrictEqual([ADDR_B]);
  });

  it('excludes named fields only at the top level', () => {
    const data = build(
      'PermitBatch',
      {
        PermitBatch: [
          { name: 'spender', type: 'address' },
          { name: 'details', type: 'Detail' },
        ],
        Detail: [{ name: 'spender', type: 'address' }],
      },
      { spender: ADDR_A, details: { spender: ADDR_B } },
    );
    expect(
      extractSignatureAddresses(data, { excludeFields: ['spender'] }).addresses,
    ).toStrictEqual([ADDR_B]);
  });

  it('canonicalizes to lower case and de-duplicates case-insensitively', () => {
    const data = build(
      'Pair',
      {
        Pair: [
          { name: 'a', type: 'address' },
          { name: 'b', type: 'address' },
        ],
      },
      { a: ADDR_A.toUpperCase().replace('0X', '0x'), b: ADDR_A },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([ADDR_A]);
  });

  it('normalizes non-canonical address encodings', () => {
    const decimal = BigInt(ADDR_A).toString(10);
    const padded = `0x000000${ADDR_A.slice(2)}`;
    const data = build(
      'Pair',
      {
        Pair: [
          { name: 'a', type: 'address' },
          { name: 'b', type: 'address' },
        ],
      },
      { a: decimal, b: padded },
    );
    expect(extractSignatureAddresses(data).addresses).toStrictEqual([ADDR_A]);
  });

  it('reports the field name each address was found under', () => {
    const data = build(
      'T',
      {
        T: [
          { name: 'to', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
      },
      { to: ADDR_A, spender: ADDR_B },
    );
    expect(extractSignatureAddresses(data).fields).toStrictEqual({
      [ADDR_A]: 'to',
      [ADDR_B]: 'spender',
    });
  });

  it('flags overflow when more than the cap distinct addresses are present', () => {
    const fields = Array.from({ length: 15 }, (_, i) => ({
      name: `a${i}`,
      type: 'address',
    }));
    const message: Record<string, unknown> = {};
    fields.forEach((_, i) => {
      message[`a${i}`] = `0x${(i + 1).toString(16).padStart(40, '0')}`;
    });
    const result = extractSignatureAddresses(
      build('Many', { Many: fields }, message),
    );
    expect(result.addresses).toHaveLength(10);
    expect(result.overflow).toBe(true);
  });

  it('does not flag overflow at exactly the cap', () => {
    const fields = Array.from({ length: 10 }, (_, i) => ({
      name: `a${i}`,
      type: 'address',
    }));
    const message: Record<string, unknown> = {};
    fields.forEach((_, i) => {
      message[`a${i}`] = `0x${(i + 1).toString(16).padStart(40, '0')}`;
    });
    const result = extractSignatureAddresses(
      build('Many', { Many: fields }, message),
    );
    expect(result.addresses).toHaveLength(10);
    expect(result.overflow).toBe(false);
  });

  it('flags overflow when the work budget truncates the walk', () => {
    const pad = Array.from({ length: 6000 }, (_, i) => i);
    const data = build(
      'Batch',
      {
        Batch: [
          { name: 'pad', type: 'uint256[]' },
          { name: 'evil', type: 'address' },
        ],
      },
      { pad, evil: ADDR_C },
    );
    const result = extractSignatureAddresses(data);
    expect(result.addresses).toStrictEqual([]);
    expect(result.overflow).toBe(true);
  });

  it('flags overflow when nesting exceeds the depth limit', () => {
    const depth = 14;
    const types: Types = {};
    for (let i = 0; i < depth; i++) {
      types[`L${i}`] = [
        i < depth - 1
          ? { name: 'next', type: `L${i + 1}` }
          : { name: 'addr', type: 'address' },
      ];
    }
    let message: Record<string, unknown> = { addr: ADDR_A };
    for (let i = depth - 2; i >= 0; i--) {
      message = { next: message };
    }
    const result = extractSignatureAddresses(build('L0', types, message));
    expect(result.addresses).toStrictEqual([]);
    expect(result.overflow).toBe(true);
  });
});
