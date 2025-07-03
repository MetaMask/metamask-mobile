import useSupportedTokens from './useSupportedTokens';
import { SUPPORTED_DEPOSIT_TOKENS } from '../constants';

describe('useSupportedTokens', () => {
  it('return the supported tokens constant', () => {
    const result = useSupportedTokens();
    expect(result).toEqual(SUPPORTED_DEPOSIT_TOKENS);
  });
});
