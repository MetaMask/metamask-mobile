import { getPrivacyMaskText } from './privacyMask';

describe('privacyMask', () => {
  it('returns fixed-length dot strings', () => {
    expect(getPrivacyMaskText('short').length).toBe(6);
    expect(getPrivacyMaskText('medium').length).toBe(9);
    expect(getPrivacyMaskText('long').length).toBe(12);
    expect(getPrivacyMaskText('short')).toBe('•'.repeat(6));
  });
});
