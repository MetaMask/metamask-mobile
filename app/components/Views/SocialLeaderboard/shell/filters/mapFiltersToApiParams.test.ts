import { DEFAULT_FILTERS } from './filterDefaults';
import { mapFiltersToApiParams } from './mapFiltersToApiParams';
import { ALL_CHAINS, SPOT_CHAINS } from '../../../shared/top-traders-constants';

describe('mapFiltersToApiParams', () => {
  it('forwards the full chain set when network is all', () => {
    const result = mapFiltersToApiParams({
      ...DEFAULT_FILTERS,
      type: 'tokens',
      network: 'all',
    });

    expect(result.chains).toEqual(SPOT_CHAINS);
  });

  it('forwards type-specific chains for the all type filter', () => {
    const result = mapFiltersToApiParams({
      ...DEFAULT_FILTERS,
      type: 'all',
      network: 'all',
    });

    expect(result.chains).toEqual(ALL_CHAINS);
  });

  it('maps the BNB network filter to the bsc chain id', () => {
    const result = mapFiltersToApiParams({
      ...DEFAULT_FILTERS,
      network: 'bnb',
    });

    expect(result.chains).toEqual(['bsc']);
    expect(result.network).toBe('bnb');
  });

  it('forwards a single chain id for other specific networks', () => {
    const result = mapFiltersToApiParams({
      ...DEFAULT_FILTERS,
      network: 'solana',
    });

    expect(result.chains).toEqual(['solana']);
  });
});
