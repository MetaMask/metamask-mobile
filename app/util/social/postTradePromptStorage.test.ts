import { SOCIAL_POST_TRADE_PROMPTS } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';
import {
  getShareSheetCount,
  hasSeenClaimSheet,
  incrementShareSheetCount,
  markClaimSheetSeen,
} from './postTradePromptStorage';

jest.mock('../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

const mockStorage = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
let stored: Record<string, string>;

describe('postTradePromptStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stored = {};
    mockStorage.getItemSync.mockImplementation((key) => stored[key] ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => {
      stored[key] = value;
    });
  });

  it('returns 0 when nothing is stored', () => {
    expect(getShareSheetCount('0xABC', 'swap')).toBe(0);
    expect(hasSeenClaimSheet('perps')).toBe(false);
  });

  it('counts share sheets per lowercased address and product', () => {
    incrementShareSheetCount('0xABC', 'swap');
    incrementShareSheetCount('0xabc', 'swap');
    incrementShareSheetCount('0xABC', 'perps');

    expect(getShareSheetCount('0xAbC', 'swap')).toBe(2);
    expect(getShareSheetCount('0xabc', 'perps')).toBe(1);
    expect(getShareSheetCount('0xdef', 'swap')).toBe(0);
    expect(mockStorage.setItem).toHaveBeenLastCalledWith(
      SOCIAL_POST_TRADE_PROMPTS,
      expect.any(String),
    );
  });

  it('marks claim sheets seen per product', () => {
    markClaimSheetSeen('swap');

    expect(hasSeenClaimSheet('swap')).toBe(true);
    expect(hasSeenClaimSheet('perps')).toBe(false);
  });

  it('keeps counts when a claim flag is written', () => {
    incrementShareSheetCount('0xabc', 'swap');
    markClaimSheetSeen('perps');

    expect(getShareSheetCount('0xabc', 'swap')).toBe(1);
  });

  it('falls back to defaults for malformed stored data', () => {
    stored[SOCIAL_POST_TRADE_PROMPTS] = 'not json';
    expect(getShareSheetCount('0xabc', 'swap')).toBe(0);

    stored[SOCIAL_POST_TRADE_PROMPTS] = JSON.stringify({
      shareSheetCounts: { '0xabc': { swap: 'two' } },
      claimSheetSeen: [],
    });
    expect(getShareSheetCount('0xabc', 'swap')).toBe(0);
    expect(hasSeenClaimSheet('swap')).toBe(false);
  });

  it('ignores storage write failures', () => {
    mockStorage.setItem.mockRejectedValue(new Error('disk full'));
    expect(() => incrementShareSheetCount('0xabc', 'swap')).not.toThrow();

    mockStorage.setItem.mockImplementation(() => {
      throw new Error('sync failure');
    });
    expect(() => markClaimSheetSeen('swap')).not.toThrow();
  });
});
