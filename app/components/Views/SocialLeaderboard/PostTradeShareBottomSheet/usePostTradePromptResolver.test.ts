import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectIsProfileTradingActivityPrivate,
  selectProfileControllerLinkedEvmAddress,
} from '../../../../selectors/profileController';
import {
  getShareSheetCount,
  hasSeenClaimSheet,
} from '../../../../util/social/postTradePromptStorage';
import { usePostTradePromptResolver } from './usePostTradePromptResolver';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectInternalAccounts: jest.fn(),
}));
jest.mock('../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: jest.fn(),
}));
jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);
jest.mock('../../../../selectors/profileController', () => ({
  selectIsProfileTradingActivityPrivate: jest.fn(),
  selectProfileControllerLinkedEvmAddress: jest.fn(),
}));
jest.mock('../../../../util/social/postTradePromptStorage', () => ({
  getShareSheetCount: jest.fn(),
  hasSeenClaimSheet: jest.fn(),
}));

const LINKED = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

const linkedAccount = { id: 'linked-id', address: LINKED };
const otherAccount = { id: 'other-id', address: OTHER };

const mockSelectors = ({
  enabled = true,
  linkedEvmAddress = LINKED as string | null,
  isProfileTradingActivityPrivate = false,
  selectedGroup = [linkedAccount],
}: {
  enabled?: boolean;
  linkedEvmAddress?: string | null;
  isProfileTradingActivityPrivate?: boolean;
  selectedGroup?: { id: string; address: string }[];
} = {}) => {
  const values = new Map<unknown, unknown>([
    [selectIsSocialV1Enabled, enabled],
    [selectProfileControllerLinkedEvmAddress, linkedEvmAddress],
    [selectIsProfileTradingActivityPrivate, isProfileTradingActivityPrivate],
    [selectInternalAccounts, [linkedAccount, otherAccount]],
    [selectSelectedAccountGroupInternalAccounts, selectedGroup],
  ]);
  (useSelector as jest.Mock).mockImplementation((selector) =>
    values.get(selector),
  );
};

describe('usePostTradePromptResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getShareSheetCount as jest.Mock).mockReturnValue(0);
    (hasSeenClaimSheet as jest.Mock).mockReturnValue(false);
  });

  it('returns the share sheet on the linked account with a count under the limit', () => {
    mockSelectors();
    (getShareSheetCount as jest.Mock).mockReturnValue(2);

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('swap')).toEqual({
      kind: 'share_sheet',
      countKey: { address: LINKED, product: 'swap' },
    });
    expect(getShareSheetCount).toHaveBeenCalledWith(LINKED, 'swap');
  });

  it('returns the post-to-feed toast after three share sheets', () => {
    mockSelectors();
    (getShareSheetCount as jest.Mock).mockReturnValue(3);

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('perps')).toEqual({ kind: 'post_to_feed_toast' });
  });

  it('returns none when the linked account is not in the selected group', () => {
    mockSelectors({ selectedGroup: [otherAccount] });

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('swap')).toEqual({ kind: 'none' });
  });

  it('returns none when the linked wallet is not in this wallet', () => {
    mockSelectors({
      linkedEvmAddress: '0x3333333333333333333333333333333333333333',
    });

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('swap')).toEqual({ kind: 'none' });
  });

  it('returns the claim sheet for a user without a profile', () => {
    mockSelectors({ linkedEvmAddress: null });

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('perps')).toEqual({ kind: 'claim_sheet' });
    expect(hasSeenClaimSheet).toHaveBeenCalledWith('perps');
    expect(getShareSheetCount).not.toHaveBeenCalled();
  });

  it('returns none when Social V1 is off', () => {
    mockSelectors({ enabled: false });

    const { result } = renderHook(() => usePostTradePromptResolver());

    expect(result.current('swap')).toEqual({ kind: 'none' });
  });
});
