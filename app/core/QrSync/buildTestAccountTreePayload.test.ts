import { mnemonicToSeed } from '@metamask/key-tree';
import { toEntropySourceId } from '@metamask/keyring-sdk';

import { buildTestAccountTreePayload } from './buildTestAccountTreePayload';

const TEST_MNEMONIC =
  'leisure swallow trip elbow prison wait rely keep supply hole general mountain';

describe('buildTestAccountTreePayload', () => {
  it('uses entropy-derived wallet and group ids for the mnemonic', async () => {
    const seed = await mnemonicToSeed(TEST_MNEMONIC);
    const entropySourceId = await toEntropySourceId('mnemonic', seed);
    const walletId = `wallet:${entropySourceId}`;

    const payload = await buildTestAccountTreePayload({
      mnemonic: TEST_MNEMONIC,
      walletName: 'Extension Wallet',
      accountName: 'Synced Account',
    });

    expect(payload).toMatchObject({
      version: 1,
      wallets: [
        {
          id: walletId,
          type: 'mnemonic',
          value: expect.any(Array),
          metadata: { name: 'Extension Wallet' },
          groups: [
            {
              id: `${walletId}/0`,
              groupIndex: 0,
              metadata: {
                name: 'Synced Account',
                pinned: false,
                hidden: false,
              },
            },
          ],
        },
      ],
    });
  });

  it('returns the same wallet id for the same mnemonic', async () => {
    const [first, second] = await Promise.all([
      buildTestAccountTreePayload({ mnemonic: TEST_MNEMONIC }),
      buildTestAccountTreePayload({ mnemonic: `  ${TEST_MNEMONIC}  ` }),
    ]);

    expect(first.wallets[0].id).toBe(second.wallets[0].id);
    expect(first.wallets[0].id).toMatch(/^wallet:entropy:mnemonic:/u);
  });
});
