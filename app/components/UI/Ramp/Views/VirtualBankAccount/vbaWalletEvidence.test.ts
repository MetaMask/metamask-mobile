import {
  AutorampStatus,
  type AutorampAccount,
  type MoneyAccountWalletRegistration,
} from '@metamask/ramps-controller';
import { hasVbaWalletEvidence, matchesVbaWallet } from './vbaWalletEvidence';

const WALLET = '0xabc';

const makeAutoramp = (walletAddress: string): AutorampAccount =>
  ({
    walletAddress,
    id: 'autoramp-1',
    customerId: 'customer-1',
    status: AutorampStatus.Approved,
    lastSeenStatus: AutorampStatus.Approved,
    updatedAt: 1,
  }) as AutorampAccount;

const makeRegistration = (
  walletAddress: string,
): MoneyAccountWalletRegistration => ({
  walletAddress,
  status: 'active',
  updatedAt: 1,
});

describe('matchesVbaWallet', () => {
  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(matchesVbaWallet(WALLET, ' 0xABC ')).toBe(true);
    expect(matchesVbaWallet(WALLET, '0xdef')).toBe(false);
  });
});

describe('hasVbaWalletEvidence', () => {
  it('is true for a registration row for the wallet', () => {
    expect(hasVbaWalletEvidence(WALLET, [], [makeRegistration('0xABC')])).toBe(
      true,
    );
  });

  it('is true for an autoramp for the wallet', () => {
    expect(hasVbaWalletEvidence(WALLET, [makeAutoramp(WALLET)], [])).toBe(true);
  });

  it('is false for another wallet or empty state', () => {
    expect(
      hasVbaWalletEvidence(
        WALLET,
        [makeAutoramp('0xdef')],
        [makeRegistration('0xdef')],
      ),
    ).toBe(false);
    expect(hasVbaWalletEvidence(WALLET, [], [])).toBe(false);
  });
});
