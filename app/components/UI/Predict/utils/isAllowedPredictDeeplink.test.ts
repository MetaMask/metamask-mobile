import { isAllowedPredictDeeplink } from './isAllowedPredictDeeplink';

describe('isAllowedPredictDeeplink', () => {
  it.each([
    'metamask://predict?feed=live',
    'https://link.metamask.io/predict?feed=live',
    'https://link-test.metamask.io/predict?feed=sports&tab=tennis',
  ])('allows MetaMask-owned Predict destination %s', (url) => {
    expect(isAllowedPredictDeeplink(url)).toBe(true);
  });

  it('rejects link.metamask.com when includeCom is false', () => {
    const url = 'https://link.metamask.com/predict?feed=live';

    const result = isAllowedPredictDeeplink(url);

    expect(result).toBe(false);
  });

  it('allows link.metamask.com when includeCom is true', () => {
    const url = 'https://link.metamask.com/predict?feed=live';

    const result = isAllowedPredictDeeplink(url, true);

    expect(result).toBe(true);
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
