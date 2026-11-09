import {
  POST_TRADE_SHARE_SHEET_LIMIT,
  resolvePostTradePrompt,
  type ResolvePostTradePromptInput,
} from './resolvePostTradePrompt';

const input = (
  overrides: Partial<ResolvePostTradePromptInput> = {},
): ResolvePostTradePromptInput => ({
  product: 'swap',
  isSocialV1Enabled: true,
  linkedEvmAddress: '0xabc',
  isProfileTradingActivityPrivate: false,
  isLinkedAccountInSelectedGroup: true,
  shareSheetCount: 0,
  hasSeenClaimSheet: false,
  ...overrides,
});

describe('resolvePostTradePrompt', () => {
  it('returns none when Social V1 is off', () => {
    expect(resolvePostTradePrompt(input({ isSocialV1Enabled: false }))).toEqual(
      { kind: 'none' },
    );
  });

  it('returns the claim sheet for a user without a profile', () => {
    expect(resolvePostTradePrompt(input({ linkedEvmAddress: null }))).toEqual({
      kind: 'claim_sheet',
    });
    expect(resolvePostTradePrompt(input({ linkedEvmAddress: '  ' }))).toEqual({
      kind: 'claim_sheet',
    });
  });

  it('returns none once the claim sheet was seen', () => {
    expect(
      resolvePostTradePrompt(
        input({ linkedEvmAddress: null, hasSeenClaimSheet: true }),
      ),
    ).toEqual({ kind: 'none' });
  });

  it('returns none when trading outside the linked account group', () => {
    expect(
      resolvePostTradePrompt(input({ isLinkedAccountInSelectedGroup: false })),
    ).toEqual({ kind: 'none' });
  });

  it('returns none for an existing private profile', () => {
    expect(
      resolvePostTradePrompt(input({ isProfileTradingActivityPrivate: true })),
    ).toEqual({ kind: 'none' });
  });

  it('keeps the create profile prompt when no profile exists', () => {
    expect(
      resolvePostTradePrompt({
        ...input({
          linkedEvmAddress: null,
          isProfileTradingActivityPrivate: true,
        }),
      }),
    ).toEqual({ kind: 'claim_sheet' });
  });

  it.each([0, 1, POST_TRADE_SHARE_SHEET_LIMIT - 1])(
    'returns the share sheet when %i sheets were completed',
    (shareSheetCount) => {
      expect(
        resolvePostTradePrompt(input({ product: 'perps', shareSheetCount })),
      ).toEqual({
        kind: 'share_sheet',
        countKey: { address: '0xabc', product: 'perps' },
      });
    },
  );

  it('returns the post-to-feed toast once the limit is reached', () => {
    expect(
      resolvePostTradePrompt(
        input({ shareSheetCount: POST_TRADE_SHARE_SHEET_LIMIT }),
      ),
    ).toEqual({ kind: 'post_to_feed_toast' });
  });
});
