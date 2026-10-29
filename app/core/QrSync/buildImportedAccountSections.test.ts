import { decodeMnemonicWords } from '@metamask/keyring-sdk';

import { buildImportedAccountSections } from './buildImportedAccountSections';

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';

const mnemonicValue = () => Array.from(decodeMnemonicWords(TEST_MNEMONIC));

describe('buildImportedAccountSections', () => {
  it('derives addresses from the mnemonic and names from secrets-stripped metadata', async () => {
    const sections = await buildImportedAccountSections(
      {
        version: 1,
        wallets: [
          {
            id: 'wallet:primary',
            type: 'mnemonic',
            metadata: { name: 'Wallet 1' },
            groups: [
              {
                id: 'wallet:primary/0',
                groupIndex: 0,
                metadata: {
                  name: 'Mobile Perf SRP 1',
                  pinned: false,
                  hidden: false,
                },
              },
              {
                id: 'wallet:primary/1',
                groupIndex: 1,
                metadata: {
                  name: 'Account 2',
                  pinned: false,
                  hidden: false,
                },
              },
            ],
          },
        ],
      },
      {
        version: 1,
        wallets: [
          {
            id: 'wallet:primary',
            type: 'mnemonic',
            value: mnemonicValue(),
            groups: [
              { id: 'wallet:primary/0', groupIndex: 0 },
              { id: 'wallet:primary/1', groupIndex: 1 },
            ],
          },
        ],
      },
    );

    expect(sections).toEqual([
      {
        id: 'wallet:primary',
        walletName: 'Wallet 1',
        accounts: [
          {
            id: 'wallet:primary/0',
            name: 'Mobile Perf SRP 1',
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          },
          {
            id: 'wallet:primary/1',
            name: 'Account 2',
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          },
        ],
      },
    ]);
  });

  it('uses names on the pending payload when metadata has not been split yet', async () => {
    const sections = await buildImportedAccountSections(null, {
      version: 1,
      wallets: [
        {
          id: 'wallet:primary',
          type: 'mnemonic',
          metadata: { name: 'Wallet 1' },
          groups: [
            {
              id: 'wallet:primary/0',
              groupIndex: 0,
              metadata: { name: 'Account 1', pinned: false, hidden: false },
            },
          ],
        },
      ],
    });

    expect(sections[0]?.walletName).toBe('Wallet 1');
    expect(sections[0]?.accounts[0]?.name).toBe('Account 1');
    expect(sections[0]?.accounts[0]?.address).toBe('');
  });

  it('skips private-key wallets', async () => {
    const sections = await buildImportedAccountSections(
      {
        version: 1,
        wallets: [
          {
            id: 'wallet:pk',
            type: 'private-key',
            metadata: { name: 'Imported Accounts' },
            groups: [],
          },
        ],
      },
      null,
    );

    expect(sections).toEqual([]);
  });
});
