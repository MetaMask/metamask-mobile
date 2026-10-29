import { resolveSocialPostComposerWallet } from './resolveSocialPostComposerWallet';

const LINKED_ID = 'acc-linked';
const LINKED_ADDRESS = '0x1111111111111111111111111111111111111111';
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222';

const linkedAccount = {
  id: LINKED_ID,
  address: LINKED_ADDRESS,
  name: 'Social Wallet',
};

describe('resolveSocialPostComposerWallet', () => {
  it('returns onboarding when no linked address is set', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: null,
      internalAccounts: [linkedAccount],
      selectedGroupAccountIds: [LINKED_ID],
      selectedGroupAddresses: [LINKED_ADDRESS],
    });

    expect(result).toEqual({ action: 'onboarding' });
  });

  it('returns onboarding when the linked address is blank', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: '   ',
      internalAccounts: [linkedAccount],
      selectedGroupAccountIds: [LINKED_ID],
      selectedGroupAddresses: [LINKED_ADDRESS],
    });

    expect(result).toEqual({ action: 'onboarding' });
  });

  it('blocks when the linked address is not in the wallet', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: LINKED_ADDRESS,
      linkedAccountId: LINKED_ID,
      internalAccounts: [
        { id: 'acc-other', address: OTHER_ADDRESS, name: 'Other' },
      ],
      selectedGroupAccountIds: ['acc-other'],
      selectedGroupAddresses: [OTHER_ADDRESS],
    });

    expect(result).toEqual({
      action: 'blocked',
      reason: 'linked_wallet_missing',
    });
  });

  it('opens compose without a toast when the linked account is in the selected group', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: LINKED_ADDRESS,
      linkedAccountId: LINKED_ID,
      internalAccounts: [linkedAccount],
      selectedGroupAccountIds: [LINKED_ID, 'acc-solana'],
      selectedGroupAddresses: [
        LINKED_ADDRESS,
        'SoL111111111111111111111111111111111111111',
      ],
    });

    expect(result).toEqual({
      action: 'compose',
      address: LINKED_ADDRESS,
      accountLabel: 'Social Wallet',
      showLinkedAccountToast: false,
    });
  });

  it('opens compose with a toast when a different account group is selected', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: LINKED_ADDRESS,
      linkedAccountId: LINKED_ID,
      internalAccounts: [
        linkedAccount,
        { id: 'acc-other', address: OTHER_ADDRESS, name: 'Other' },
      ],
      selectedGroupAccountIds: ['acc-other'],
      selectedGroupAddresses: [OTHER_ADDRESS],
    });

    expect(result).toEqual({
      action: 'compose',
      address: LINKED_ADDRESS,
      accountLabel: 'Social Wallet',
      showLinkedAccountToast: true,
    });
  });

  it('matches a linked address case-insensitively when the id is missing', () => {
    const mixedCaseAddress = `0x${LINKED_ADDRESS.slice(2).toUpperCase()}`;

    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: mixedCaseAddress,
      internalAccounts: [
        { ...linkedAccount, address: LINKED_ADDRESS.toLowerCase() },
      ],
      selectedGroupAccountIds: [LINKED_ID],
      selectedGroupAddresses: [LINKED_ADDRESS.toLowerCase()],
    });

    expect(result).toEqual({
      action: 'compose',
      address: LINKED_ADDRESS.toLowerCase(),
      accountLabel: 'Social Wallet',
      showLinkedAccountToast: false,
    });
  });

  it('uses a short address as the label when the account has no name', () => {
    const result = resolveSocialPostComposerWallet({
      linkedAccountAddress: LINKED_ADDRESS,
      internalAccounts: [{ id: LINKED_ID, address: LINKED_ADDRESS }],
      selectedGroupAccountIds: ['acc-other'],
      selectedGroupAddresses: [OTHER_ADDRESS],
    });

    expect(result).toEqual({
      action: 'compose',
      address: LINKED_ADDRESS,
      accountLabel: '0x11111...11111',
      showLinkedAccountToast: true,
    });
  });
});
