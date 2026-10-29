import { selectSwapsRebateBannerEnabled } from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectSwapsRebateBannerEnabled', () => {
  it('returns true when the remote flag is enabled', () => {
    const result = selectSwapsRebateBannerEnabled.resultFunc({
      swapsRebateBannerEnabled: { enabled: true, minimumVersion: '0.0.0' },
    });
    expect(result).toBe(true);
  });

  it('returns false when the remote flag is missing', () => {
    expect(selectSwapsRebateBannerEnabled.resultFunc({})).toBe(false);
  });
});
