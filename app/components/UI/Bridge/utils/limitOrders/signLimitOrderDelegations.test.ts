import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { PreparedLimitOrderDelegation } from '../../api/limitOrders/getDelegations/schema';
import { signLimitOrderDelegations } from './signLimitOrderDelegations';

const mockSignTypedMessage = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: (...args: unknown[]) => mockSignTypedMessage(...args),
    },
  },
}));

const DELEGATOR = '0x4751FD55E5B9723f427Cf1a298f785Ec2adCf123';

const createDelegation = (
  purpose: PreparedLimitOrderDelegation['purpose'],
): PreparedLimitOrderDelegation => ({
  purpose,
  delegation: {
    delegate: '0x0000000000000000000000000000000000000a11',
    delegator: DELEGATOR,
    authority:
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    caveats: [
      {
        enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
        terms: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
        args: '0x',
      },
    ],
    salt: '0x6572bcee6cc79e0b70128c9dd1f65f0075ebcac9b8aa38e8b6af0fa4757f2050',
    signature: '0x',
  },
  typedData: {
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: 56,
      verifyingContract: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    },
    primaryType: 'Delegation',
    types: { Delegation: [{ name: 'delegate', type: 'address' }] },
    message: { delegate: '0x0000000000000000000000000000000000000a11' },
  },
});

describe('signLimitOrderDelegations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignTypedMessage.mockResolvedValue('0xsignature');
  });

  it('fills in the delegator signature and leaves the rest of the delegation untouched', async () => {
    const delegation = createDelegation('swap');

    const [signed] = await signLimitOrderDelegations([delegation]);

    expect(signed).toStrictEqual({
      ...delegation,
      delegation: { ...delegation.delegation, signature: '0xsignature' },
    });
  });

  it('signs the payload the API issued, as V4 typed data from the delegator', async () => {
    const delegation = createDelegation('swap');

    await signLimitOrderDelegations([delegation]);

    expect(mockSignTypedMessage).toHaveBeenCalledWith(
      { from: DELEGATOR, data: delegation.typedData },
      SignTypedDataVersion.V4,
    );
  });

  it('signs every delegation in the order the API listed them', async () => {
    mockSignTypedMessage
      .mockResolvedValueOnce('0xapproval')
      .mockResolvedValueOnce('0xswap');

    const signed = await signLimitOrderDelegations([
      createDelegation('approval'),
      createDelegation('swap'),
    ]);

    expect(
      signed.map(({ purpose, delegation }) => [purpose, delegation.signature]),
    ).toStrictEqual([
      ['approval', '0xapproval'],
      ['swap', '0xswap'],
    ]);
  });

  it('rejects without a partially signed order when a delegation cannot be signed', async () => {
    mockSignTypedMessage
      .mockResolvedValueOnce('0xapproval')
      .mockRejectedValueOnce(new Error('keyring locked'));

    await expect(
      signLimitOrderDelegations([
        createDelegation('approval'),
        createDelegation('swap'),
      ]),
    ).rejects.toThrow('keyring locked');
  });

  it('returns an empty list without reaching the keyring when there is nothing to sign', async () => {
    const signed = await signLimitOrderDelegations([]);

    expect(signed).toStrictEqual([]);
    expect(mockSignTypedMessage).not.toHaveBeenCalled();
  });
});
