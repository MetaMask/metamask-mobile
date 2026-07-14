import {
  buildCardResidencyRegion,
  isCardResidencyInBlockedRegions,
} from './residency';

describe('buildCardResidencyRegion', () => {
  it('returns null when countryOfResidence is null', () => {
    expect(buildCardResidencyRegion(null, 'CA')).toBeNull();
  });

  it('returns the country code for non-US residents', () => {
    expect(buildCardResidencyRegion('gb', null)).toBe('GB');
  });

  it('returns US-{STATE} for US residents with a known state', () => {
    expect(buildCardResidencyRegion('US', 'ca')).toBe('US-CA');
  });

  it('returns US when state is unknown for a US resident', () => {
    expect(buildCardResidencyRegion('US', null)).toBe('US');
  });
});

describe('isCardResidencyInBlockedRegions', () => {
  it('fail-opens when residency is unknown', () => {
    expect(isCardResidencyInBlockedRegions(null, ['GB'])).toBe(false);
  });

  it('returns false when blocked regions is empty', () => {
    expect(isCardResidencyInBlockedRegions('GB', [])).toBe(false);
  });

  it('blocks GB residents when GB is blocked', () => {
    expect(isCardResidencyInBlockedRegions('GB', ['GB'])).toBe(true);
  });

  it('blocks all US residents when US is blocked', () => {
    expect(isCardResidencyInBlockedRegions('US-CA', ['US'])).toBe(true);
  });

  it('blocks a specific US state when US-CA is blocked', () => {
    expect(isCardResidencyInBlockedRegions('US-CA', ['US-CA'])).toBe(true);
  });

  it('does not block other US states when only US-CA is blocked', () => {
    expect(isCardResidencyInBlockedRegions('US-NY', ['US-CA'])).toBe(false);
  });

  it('does not block US residents without state when only US-CA is blocked', () => {
    expect(isCardResidencyInBlockedRegions('US', ['US-CA'])).toBe(false);
  });
});
