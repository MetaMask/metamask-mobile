import { selectCrossmintMemecoinCheckoutEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Crossmint memecoin checkout feature flag selector', () => {
  it('returns true while hardcoded pending LaunchDarkly flag', () => {
    expect(selectCrossmintMemecoinCheckoutEnabled.resultFunc({})).toBe(true);
  });
});
