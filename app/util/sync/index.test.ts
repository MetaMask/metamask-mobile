import { syncPrefs, syncAccounts } from '.';

const OLD_PREFS = {
  accountTokens: {
    '0x0942890c603273059a11a298F81cb137Be9CF704': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x120bfFfa4138fD00A8025a223C350b9ffaDAD8F5': { '0x3': [Array] },
    '0x16C6C3079edE914e83B388a52fFD9255E1c3165': { '0x3': [Array] },
    '0x223367C61c38FAcbdd0b92De5aA7B742e1e5a196': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x7b8C6B8363B9E7A77d279dDad49BEF2994a3bf28': { '0x3': [Array] },
    '0x9236413AfD369B2aeb5e52C048f6B30e7308f2e3': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x9b07Ba86631bdb74eE2DDb5750440986DECB9e11': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0xE4D7f194b07B85511973f1FAAB31b8C2F1f9F344': { '0x3': [Array] },
  },
  currentLocale: 'en',
  featureFlags: {},
  frequentRpcList: [],
  identities: {
    '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539': {
      address: '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539',
      name: 'Testy Account',
    },
  },
  ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
  lostIdentities: {},
  selectedAddress: '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539',
  tokens: [],
};
const OLD_ACCOUNTS = {
  '0x0942890c603273059a11a298F81cb137Be9CF704': {
    balance: '0x365369025dd23000',
  },
  '0x120bfFfa4138fD00A8025a223C350b9ffaDAD8F5': { balance: '0x0' },
  '0x16C6C3079edE914e83B388a52fFD9255E1c3165': { balance: '0x0' },
  '0x223367C61c38FAcbdd0b92De5aA7B742e1e5a196': {
    balance: '0x1bf5ef59d293408b',
  },
  '0x7b8C6B8363B9E7A77d279dDad49BEF2994a3bf28': { balance: '0x0' },
  '0x9236413AfD369B2aeb5e52C048f6B30e7308f2e3': { balance: '0x0' },
  '0x9b07Ba86631bdb74eE2DDb5750440986DECB9e11': { balance: '0xe8d4a51000' },
  '0xE4D7f194b07B85511973f1FAAB31b8C2F1f9F344': { balance: '0x0' },
};
const NEW_PREFS = {
  accountTokens: {
    '0x0942890c603273059a11a298F81cb137Be9CF704': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x120bfFfa4138fD00A8025a223C350b9ffaDAD8F5': { '0x3': [Array] },
    '0x16C6C3079edE914e83B388a52fFD9255E1c3165': { '0x3': [Array] },
    '0x223367C61c38FAcbdd0b92De5aA7B742e1e5a196': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x7b8C6B8363B9E7A77d279dDad49BEF2994a3bf28': { '0x3': [Array] },
    '0x9236413AfD369B2aeb5e52C048f6B30e7308f2e3': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0x9b07Ba86631bdb74eE2DDb5750440986DECB9e11': {
      '0x1': [Array],
      '0x3': [Array],
    },
    '0xE4D7f194b07B85511973f1FAAB31b8C2F1f9F344': { '0x3': [Array] },
  },
  currentLocale: 'en',
  featureFlags: {},
  frequentRpcList: [],
  identities: {
    '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539': {
      address: '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539',
      name: 'Account 1',
    },
    '0x7f9f9A0e248Ef58298e911219e5B45D610C4B589': {
      address: '0x7f9f9A0e248Ef58298e911219e5B45D610C4B589',
      name: 'Account 2',
    },
  },
  ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
  lostIdentities: {},
  selectedAddress: '0x7f9f9A0e248Ef58298e911219e5B45D610C4B539',
  tokens: [],
};
const NEW_ACCOUNTS = {
  '0x0942890c603273059a11a298F81cb137Be9CF704': { balance: '0x0' },
  '0x120bfFfa4138fD00A8025a223C350b9ffaDAD8F5': { balance: '0x0' },
  '0x16C6C3079edE914e83B388a52fFD9255E1c3165': { balance: '0x0' },
  '0x223367C61c38FAcbdd0b92De5aA7B742e1e5a196': { balance: '0x0' },
  '0x7b8C6B8363B9E7A77d279dDad49BEF2994a3bf28': { balance: '0x0' },
  '0x9236413AfD369B2aeb5e52C048f6B30e7308f2e3': { balance: '0x0' },
  '0x9b07Ba86631bdb74eE2DDb5750440986DECB9e11': { balance: '0x0' },
  '0xE4D7f194b07B85511973f1FAAB31b8C2F1f9F344': { balance: '0x0' },
};

describe('Success Sync', () => {
  it('should succeed sync prefs of varying lengths', async () => {
    const syncedPrefs = await syncPrefs(OLD_PREFS, NEW_PREFS);
    expect(Object.values(syncedPrefs.identities)[0]).toEqual(
      Object.values(syncedPrefs.identities)[0],
    );
    expect(Object.values(syncedPrefs.identities)[1]).not.toBeUndefined();
    expect(Object.values(syncedPrefs.identities).length).not.toEqual(
      Object.values(OLD_PREFS.identities).length,
    );
  });
  it('should succeed sync accounts balances', async () => {
    const syncedAccounts = await syncAccounts(OLD_ACCOUNTS, NEW_ACCOUNTS);
    expect(Object.values(syncedAccounts)[0].balance).toEqual(
      Object.values(OLD_ACCOUNTS)[0].balance,
    );
    expect(Object.values(syncedAccounts)[3].balance).toEqual(
      Object.values(OLD_ACCOUNTS)[3].balance,
    );
    expect(Object.values(syncedAccounts)[6].balance).toEqual(
      Object.values(OLD_ACCOUNTS)[6].balance,
    );
  });
});

describe('Error Syncs', () => {
  it('should return undefined sync prefs', async () => {
    expect(await syncPrefs(OLD_PREFS, undefined)).toEqual(undefined);
  });
  it('should return new sync prefs', async () => {
    expect(await syncPrefs(undefined, NEW_PREFS)).toEqual(NEW_PREFS);
  });
  it('should return new sync accounts', async () => {
    expect(await syncAccounts(undefined, NEW_ACCOUNTS)).toEqual(NEW_ACCOUNTS);
  });
  it('should return undefined sync accounts', async () => {
    expect(await syncAccounts(OLD_ACCOUNTS, undefined)).toEqual(undefined);
  });
});
