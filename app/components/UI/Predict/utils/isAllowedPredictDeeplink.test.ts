import { isAllowedPredictDeeplink } from './isAllowedPredictDeeplink';

describe('isAllowedPredictDeeplink', () => {
  it.each([
    'metamask://predict?feed=live',
    'https://link.metamask.io/predict?feed=live',
    'https://link-test.metamask.io/predict?feed=sports&tab=tennis',
  ])('allows MetaMask-owned Predict destination %s', (url) => {
    expect(isAllowedPredictDeeplink(url)).toBe(true);
  });

  it.each([
    'metamask://connect?channelId=test',
    'https://link.metamask.io/swap',
    'https://example.com/predict',
    'http://link.metamask.io/predict',
    'not-a-url',
    '',
  ])('rejects non-Predict destination %s', (url) => {
    expect(isAllowedPredictDeeplink(url)).toBe(false);
  });
});
