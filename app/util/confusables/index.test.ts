import {
  hasZeroWidthPoints,
  collectConfusables,
  getConfusablesExplanations,
} from '.';

describe('hasZeroWidthPoints', () => {
  it('should detect zero-width unicode', () => {
    expect('vita‍lik.eth'.split('').some(hasZeroWidthPoints)).toEqual(true);
  });
  it('should not detect zero-width unicode', () => {
    expect('vitalik.eth'.split('').some(hasZeroWidthPoints)).toEqual(false);
  });
});

describe('collectConfusables', () => {
  it('should detect homoglyphic unicode points', () => {
    expect(collectConfusables('vita‍lik.eth')).toHaveLength(1);
    expect(collectConfusables('faceboоk.eth')).toHaveLength(1);
  });

  it('should detect multiple homoglyphic unicode points', () => {
    expect(collectConfusables('ѕсоре.eth')).toHaveLength(5);
  });
});

describe('getConfusablesExplanations', () => {
  it('should get the right number of explanations', () => {
    expect(
      getConfusablesExplanations(collectConfusables('ѕсоре.eth')),
    ).toHaveLength(5);
    expect(
      getConfusablesExplanations(collectConfusables('metamask.eth')),
    ).toHaveLength(1);
  });
});
