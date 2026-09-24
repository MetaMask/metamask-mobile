import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  getVbaTermsOneAcceptance,
  hasAcceptedVbaTermsOne,
  saveVbaTermsOneAcceptance,
} from './vbaTermsOneStorage';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockStorage = jest.mocked(StorageWrapper);

describe('VBA Terms 1 storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  it('stores accepted disclaimer ids under a normalized wallet key', async () => {
    await saveVbaTermsOneAcceptance('0xAbC', ['privacy', 'terms']);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      '@MetaMask:vbaTermsOneAccepted:v1:0xabc',
      '{"disclaimerIds":["privacy","terms"]}',
    );
  });

  it('reads a valid acceptance', async () => {
    mockStorage.getItem.mockResolvedValue(
      '{"disclaimerIds":["privacy","terms"]}',
    );

    await expect(getVbaTermsOneAcceptance('0xAbC')).resolves.toStrictEqual({
      disclaimerIds: ['privacy', 'terms'],
    });
    await expect(hasAcceptedVbaTermsOne('0xAbC')).resolves.toBe(true);
  });

  it('ignores malformed acceptance data', async () => {
    mockStorage.getItem.mockResolvedValue('not-json');

    await expect(getVbaTermsOneAcceptance('0xabc')).resolves.toBeNull();
    await expect(hasAcceptedVbaTermsOne('0xabc')).resolves.toBe(false);
  });
});
