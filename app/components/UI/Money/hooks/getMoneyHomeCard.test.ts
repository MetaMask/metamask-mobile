import { getMoneyHomeCard, type MoneyHomeCardInputs } from './getMoneyHomeCard';
import type { VbaHomeCard } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';

const baseInputs: MoneyHomeCardInputs = {
  isEligibilityLoading: false,
  isMoneyBalanceLoading: false,
  isCryptoBalanceLoading: false,
  isCardStateResolved: true,
  vbaCard: { type: 'none' },
  isVbaEligible: true,
  hasCrypto: false,
  hasUsableAutoramp: false,
  isMoneyAccountFunded: false,
  isCardLinked: false,
  isResidencyBlocked: false,
  isCardStepSkipped: false,
  isKycDecisionDismissed: false,
};

const card = (type: VbaHomeCard['type']): VbaHomeCard => ({ type });

describe('getMoneyHomeCard', () => {
  it('returns none while VBA eligibility is loading', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isEligibilityLoading: true,
      vbaCard: card('get_started'),
    });

    expect(result).toEqual({ type: 'none' });
  });

  it('returns none while balances are loading for a card that depends on them', () => {
    const moneyLoading = getMoneyHomeCard({
      ...baseInputs,
      isMoneyBalanceLoading: true,
      vbaCard: card('get_started'),
    });
    const cryptoLoading = getMoneyHomeCard({
      ...baseInputs,
      isCryptoBalanceLoading: true,
      vbaCard: card('account_is_ready'),
    });

    expect(moneyLoading).toEqual({ type: 'none' });
    expect(cryptoLoading).toEqual({ type: 'none' });
  });

  it('returns the KYC pending card while crypto and Money balances are still loading', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isMoneyBalanceLoading: true,
      isCryptoBalanceLoading: true,
      hasCrypto: true,
      vbaCard: card('kyc_pending'),
    });

    expect(result).toEqual({ type: 'vba', variant: 'kyc_pending' });
  });

  it('returns Get started for an eligible empty wallet that has not started', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('get_started'),
    });

    expect(result).toEqual({ type: 'vba', variant: 'get_started' });
  });

  it('returns Add funds onboarding when an eligible wallet already has crypto', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      hasCrypto: true,
      vbaCard: card('get_started'),
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns the card onboarding step when a crypto wallet has funded the Money account', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      hasCrypto: true,
      isMoneyAccountFunded: true,
      vbaCard: card('get_started'),
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns finish verification even when the wallet has crypto', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      hasCrypto: true,
      vbaCard: card('finish_verification'),
    });

    expect(result).toEqual({ type: 'vba', variant: 'finish_verification' });
  });

  it('returns the KYC decision card until it is dismissed', () => {
    const showing = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('kyc_decision'),
    });
    const dismissed = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('kyc_decision'),
      isKycDecisionDismissed: true,
    });

    expect(showing).toEqual({ type: 'vba', variant: 'kyc_decision' });
    expect(dismissed).toEqual({ type: 'onboarding' });
  });

  it('returns the card onboarding step after KYC decision is dismissed on a funded account', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('kyc_decision'),
      isKycDecisionDismissed: true,
      isMoneyAccountFunded: true,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns Account is ready when KYC is approved, no autoramp exists, and the account is unfunded', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      hasCrypto: true,
      vbaCard: card('account_is_ready'),
    });

    expect(result).toEqual({ type: 'vba', variant: 'account_is_ready' });
  });

  it('returns the card onboarding step once a first deposit funds the Money account', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('account_is_ready'),
      isMoneyAccountFunded: true,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns none when KYC is approved, the autoramp is active, and the account is unfunded', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('account_is_ready'),
      hasUsableAutoramp: true,
    });

    expect(result).toEqual({ type: 'none' });
  });

  it('returns the card onboarding step when an active autoramp account is funded and the card is not linked', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      vbaCard: card('account_is_ready'),
      hasUsableAutoramp: true,
      isMoneyAccountFunded: true,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns none when the card is linked, residency-blocked, or the card step was skipped', () => {
    const linked = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isMoneyAccountFunded: true,
      isCardLinked: true,
    });
    const blocked = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isMoneyAccountFunded: true,
      isResidencyBlocked: true,
    });
    const skipped = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isCardStepSkipped: true,
    });

    expect(linked).toEqual({ type: 'none' });
    expect(blocked).toEqual({ type: 'none' });
    expect(skipped).toEqual({ type: 'none' });
  });

  it('returns Add funds onboarding for a user outside a VBA region', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns Add funds onboarding for a residency-blocked user who has not funded', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isResidencyBlocked: true,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });

  it('returns none for an eligible empty wallet with no VBA card and no Money balance', () => {
    const result = getMoneyHomeCard(baseInputs);

    expect(result).toEqual({ type: 'none' });
  });

  it('returns none while card state is unresolved for a funded account', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isMoneyAccountFunded: true,
      isCardStateResolved: false,
    });

    expect(result).toEqual({ type: 'none' });
  });

  it('returns Add funds onboarding while card state is unresolved and the account is unfunded', () => {
    const result = getMoneyHomeCard({
      ...baseInputs,
      isVbaEligible: false,
      isCardStateResolved: false,
    });

    expect(result).toEqual({ type: 'onboarding' });
  });
});
