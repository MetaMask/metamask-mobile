import generateUserProfileAnalyticsMetaData, {
  getAccountCompositionTraits,
} from './generateUserProfileAnalyticsMetaData';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import { Appearance } from 'react-native';
import { KeyringTypes } from '@metamask/keyring-controller';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';

const mockGetState = jest.fn();
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => mockGetState()),
  },
}));

const mockIsMetricsEnabled = jest.fn();
jest.mock('../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({ isEnabled: mockIsMetricsEnabled })),
  },
}));

const mockGetConfiguredCaipChainIds = jest.fn();
jest.mock('../MultichainAPI/networkMetricUtils', () => ({
  getConfiguredCaipChainIds: jest.fn(() => mockGetConfiguredCaipChainIds()),
}));

// Helper to create an HD account with the new entropy structure
function makeHdAccount(
  id: string,
  entropyId: string,
  groupIndex: number,
): InternalAccount {
  return {
    id,
    address: `0x${id}`,
    options: {
      entropy: {
        type: KeyringAccountEntropyTypeOption.Mnemonic,
        id: entropyId,
        derivationPath: "m/44'/60'/0'/0/0",
        groupIndex,
      },
    },
    metadata: { name: id, importTime: 0, keyring: { type: KeyringTypes.hd } },
    methods: [],
    type: 'eip155:eoa',
    scopes: ['eip155:0'],
  } as unknown as InternalAccount;
}

// Helper to create a non-HD account (imported, hardware, snap)
function makeAccount(id: string, keyringType: KeyringTypes): InternalAccount {
  return {
    id,
    address: `0x${id}`,
    options: {},
    metadata: { name: id, importTime: 0, keyring: { type: keyringType } },
    methods: [],
    type: 'eip155:eoa',
    scopes: ['eip155:0'],
  } as unknown as InternalAccount;
}

const mockState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        displayNftMedia: true,
        useNftDetection: false,
        useTokenDetection: true,
        isMultiAccountBalancesEnabled: false,
        securityAlertsEnabled: true,
      },
      AccountsController: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
  },
  user: { appTheme: 'os' },
  security: { dataCollectionForMarketing: true },
};

describe('generateUserProfileAnalyticsMetaData', () => {
  beforeEach(() => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    mockGetConfiguredCaipChainIds.mockReturnValue(['eip155:1']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns metadata with account composition traits', () => {
    mockGetState.mockReturnValue(mockState);
    mockIsMetricsEnabled.mockReturnValue(true);

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata).toMatchObject({
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.ON,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.THEME]: 'dark',
      [UserProfileProperty.TOKEN_DETECTION]: UserProfileProperty.ON,
      [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: UserProfileProperty.OFF,
      [UserProfileProperty.SECURITY_PROVIDERS]: 'blockaid',
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
      [UserProfileProperty.CHAIN_IDS]: ['eip155:1'],
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: 0,
      [UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]: 0,
      [UserProfileProperty.NUMBER_OF_IMPORTED_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_TREZOR_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_LATTICE_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_QR_HARDWARE_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]: 0,
    });
  });

  it.each([
    [true, true],
    [false, false],
  ])('returns marketing consent "%s"', (expected, stateConsentValue) => {
    mockGetState.mockReturnValue({
      ...mockState,
      security: { dataCollectionForMarketing: stateConsentValue },
    });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.HAS_MARKETING_CONSENT]).toEqual(
      expected,
    );
  });

  it('returns default metadata when missing preferences controller', () => {
    mockGetState.mockReturnValue({
      ...mockState,
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: { accounts: {}, selectedAccount: '' },
          },
        },
      },
    });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata).toMatchObject({
      [UserProfileProperty.ENABLE_OPENSEA_API]: UserProfileProperty.OFF,
      [UserProfileProperty.NFT_AUTODETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.TOKEN_DETECTION]: UserProfileProperty.OFF,
      [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: UserProfileProperty.OFF,
      [UserProfileProperty.SECURITY_PROVIDERS]: '',
      [UserProfileProperty.CHAIN_IDS]: ['eip155:1'],
    });
  });

  it('returns user preference for theme', () => {
    mockGetState.mockReturnValue({ ...mockState, user: { appTheme: 'light' } });

    const metadata = generateUserProfileAnalyticsMetaData();
    expect(metadata[UserProfileProperty.THEME]).toBe('light');
  });
});

describe('getAccountCompositionTraits', () => {
  it('returns all zeros for empty accounts', () => {
    const traits = getAccountCompositionTraits({});
    expect(traits).toEqual({
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: 0,
      [UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]: 0,
      [UserProfileProperty.NUMBER_OF_IMPORTED_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_TREZOR_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_LATTICE_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_QR_HARDWARE_ACCOUNTS]: 0,
      [UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]: 0,
    });
  });

  it('counts a single HD account group correctly', () => {
    const acct = makeHdAccount('acct1', 'srp1', 0);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(1);
  });

  it('deduplicates accounts from the same SRP and group index (multichain addresses)', () => {
    // Same SRP, same group index → one account group (EVM + Solana addresses for same "account")
    const evm = makeHdAccount('evm1', 'srp1', 0);
    const sol = makeHdAccount('sol1', 'srp1', 0);
    const traits = getAccountCompositionTraits({
      [evm.id]: evm,
      [sol.id]: sol,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(1);
  });

  it('counts separate group indexes as separate account groups', () => {
    // Same SRP, different group indexes → two account groups
    const acct1 = makeHdAccount('acct1', 'srp1', 0);
    const acct2 = makeHdAccount('acct2', 'srp1', 1);
    const traits = getAccountCompositionTraits({
      [acct1.id]: acct1,
      [acct2.id]: acct2,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(2);
  });

  it('counts multiple SRPs correctly', () => {
    const acct1 = makeHdAccount('acct1', 'srp1', 0);
    const acct2 = makeHdAccount('acct2', 'srp2', 0);
    const traits = getAccountCompositionTraits({
      [acct1.id]: acct1,
      [acct2.id]: acct2,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(2);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(2);
  });

  it('counts imported accounts', () => {
    const acct = makeAccount('imported1', KeyringTypes.simple);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_IMPORTED_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(0);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(0);
  });

  it('counts Ledger accounts and hardware wallets', () => {
    const acct = makeAccount('ledger1', KeyringTypes.ledger);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(0);
  });

  it('counts Trezor accounts', () => {
    const acct = makeAccount('trezor1', KeyringTypes.trezor);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_TREZOR_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('counts Lattice accounts', () => {
    const acct = makeAccount('lattice1', KeyringTypes.lattice);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_LATTICE_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('counts QR hardware accounts (qr keyring)', () => {
    const acct = makeAccount('qr1', KeyringTypes.qr);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_QR_HARDWARE_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('counts QR hardware accounts (oneKey keyring)', () => {
    const acct = makeAccount('onekey1', KeyringTypes.oneKey);
    const traits = getAccountCompositionTraits({ [acct.id]: acct });
    expect(traits[UserProfileProperty.NUMBER_OF_QR_HARDWARE_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('number_of_hardware_wallets counts device types, not total accounts (1 Ledger + 1 QR = 2)', () => {
    const ledger = makeAccount('ledger1', KeyringTypes.ledger);
    const qr = makeAccount('qr1', KeyringTypes.qr);
    const traits = getAccountCompositionTraits({
      [ledger.id]: ledger,
      [qr.id]: qr,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(2);
  });

  it('multiple accounts of the same hardware type count as 1 wallet (3 Ledger = 1)', () => {
    const ledger1 = makeAccount('ledger1', KeyringTypes.ledger);
    const ledger2 = makeAccount('ledger2', KeyringTypes.ledger);
    const ledger3 = makeAccount('ledger3', KeyringTypes.ledger);
    const traits = getAccountCompositionTraits({
      [ledger1.id]: ledger1,
      [ledger2.id]: ledger2,
      [ledger3.id]: ledger3,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]).toBe(3);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('hardware wallet accounts do not contribute to number_of_hd_entropies', () => {
    const ledger = makeAccount('ledger1', KeyringTypes.ledger);
    const trezor = makeAccount('trezor1', KeyringTypes.trezor);
    const traits = getAccountCompositionTraits({
      [ledger.id]: ledger,
      [trezor.id]: trezor,
    });
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(0);
  });

  it('handles mixed wallet composition', () => {
    const hdEvm = makeHdAccount('hd-evm', 'srp1', 0);
    const hdSol = makeHdAccount('hd-sol', 'srp1', 0);
    const hdEvm2 = makeHdAccount('hd-evm2', 'srp1', 1);
    const imported = makeAccount('imported', KeyringTypes.simple);
    const ledger = makeAccount('ledger', KeyringTypes.ledger);

    const traits = getAccountCompositionTraits({
      [hdEvm.id]: hdEvm,
      [hdSol.id]: hdSol,
      [hdEvm2.id]: hdEvm2,
      [imported.id]: imported,
      [ledger.id]: ledger,
    });

    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(4); // srp1:0, srp1:1, imported, ledger
    expect(traits[UserProfileProperty.NUMBER_OF_IMPORTED_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_LEDGER_ACCOUNTS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HARDWARE_WALLETS]).toBe(1);
  });

  it('treats accounts without entropy structure as individual groups', () => {
    const noEntropy: InternalAccount = {
      id: 'unknown1',
      address: '0xunknown1',
      options: {},
      metadata: {
        name: 'unknown',
        importTime: 0,
        keyring: { type: 'Unknown Keyring Type' as KeyringTypes },
      },
      methods: [],
      type: 'eip155:eoa',
      scopes: ['eip155:0'],
    } as unknown as InternalAccount;

    const traits = getAccountCompositionTraits({ [noEntropy.id]: noEntropy });
    expect(traits[UserProfileProperty.NUMBER_OF_ACCOUNT_GROUPS]).toBe(1);
    expect(traits[UserProfileProperty.NUMBER_OF_HD_ENTROPIES]).toBe(0);
  });
});
