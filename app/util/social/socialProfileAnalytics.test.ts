import StorageWrapper from '../../store/storage-wrapper';
import {
  getSocialProfileCreatedAt,
  hasSocialProfileFromLinkedAddress,
  recordSocialProfileCreatedAt,
} from './socialProfileAnalytics';

jest.mock('../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItemSync = StorageWrapper.getItemSync as jest.Mock;
const mockSetItem = StorageWrapper.setItem as jest.Mock;

describe('hasSocialProfileFromLinkedAddress', () => {
  it('is true when a linked account address exists', () => {
    expect(hasSocialProfileFromLinkedAddress('0xabc')).toBe(true);
  });

  it.each([null, undefined, '', '   '])(
    'is false when the linked address is %p',
    (address) => {
      expect(hasSocialProfileFromLinkedAddress(address)).toBe(false);
    },
  );
});

describe('getSocialProfileCreatedAt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the stored creation time', () => {
    mockGetItemSync.mockReturnValue('2026-11-27T10:00:00.000Z');

    expect(getSocialProfileCreatedAt()).toBe('2026-11-27T10:00:00.000Z');
  });

  it('returns undefined when nothing is stored', () => {
    mockGetItemSync.mockReturnValue(null);

    expect(getSocialProfileCreatedAt()).toBeUndefined();
  });
});

describe('recordSocialProfileCreatedAt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the creation time the first time', async () => {
    mockGetItemSync.mockReturnValue(null);

    await recordSocialProfileCreatedAt(new Date('2026-11-27T10:00:00.000Z'));

    expect(mockSetItem).toHaveBeenCalledWith(
      'socialProfileCreatedAt',
      '2026-11-27T10:00:00.000Z',
    );
  });

  it('keeps the first stored time and does not overwrite it', async () => {
    mockGetItemSync.mockReturnValue('2026-11-01T08:00:00.000Z');

    await recordSocialProfileCreatedAt(new Date('2026-11-27T10:00:00.000Z'));

    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
