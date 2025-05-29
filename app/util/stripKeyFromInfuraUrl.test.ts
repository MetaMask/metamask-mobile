import { INFURA_PROJECT_ID } from '../constants/network';
import stripKeyFromInfuraUrl from './stripKeyFromInfuraUrl';

describe('stripKeyFromInfuraUrl', () => {
  it('returns undefined if given undefined', () => {
    expect(stripKeyFromInfuraUrl(undefined)).toBeUndefined();
  });

  it('returns an empty string if given an empty string', () => {
    expect(stripKeyFromInfuraUrl('')).toBe('');
  });

  it('removes the path from a masked Infura URL', () => {
    expect(stripKeyFromInfuraUrl('http://foo.io/v3/{infuraProjectId}')).toBe(
      'http://foo.io',
    );
  });

  it('removes the path from a non-masked Infura URL', () => {
    expect(stripKeyFromInfuraUrl(`http://foo.io/v3/${INFURA_PROJECT_ID}`)).toBe(
      'http://foo.io',
    );
  });
});
