import { filterCardSignInRegions } from './signInRegions';
import type { Region } from '../types';

const region = (key: string, canSignUp?: boolean): Region => ({
  key,
  name: key,
  ...(canSignUp === undefined ? {} : { canSignUp }),
});

describe('filterCardSignInRegions', () => {
  const immersveOnly = region('GB', false);
  const canSignUp = region('US', true);
  const neither = region('FR', false);
  const unsetCanSignUp = region('DE');

  it('keeps an Immersve country when canSignUp is false', () => {
    expect(filterCardSignInRegions([immersveOnly], ['GB'])).toEqual([
      immersveOnly,
    ]);
  });

  it('keeps a country that can sign up', () => {
    expect(filterCardSignInRegions([canSignUp], [])).toEqual([canSignUp]);
  });

  it('drops a country that is neither an Immersve country nor able to sign up', () => {
    expect(filterCardSignInRegions([neither], ['GB'])).toEqual([]);
  });

  it('drops a country when canSignUp is unset and it is not an Immersve country', () => {
    expect(filterCardSignInRegions([unsetCanSignUp], [])).toEqual([]);
  });

  it('preserves the input order of live countries', () => {
    expect(
      filterCardSignInRegions(
        [neither, canSignUp, unsetCanSignUp, immersveOnly],
        ['GB'],
      ),
    ).toEqual([canSignUp, immersveOnly]);
  });
});
