import { failedSeedPhraseRequirements, parseSeedPhrase } from '.';

const VALID_24 =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';
const VALID_12 = VALID_24.split(' ').splice(0, 12).join(' ');

describe('failedSeedPhraseRequirements', () => {
  it('Should pass for 12 word mnemonic', () => {
    expect(failedSeedPhraseRequirements(VALID_12)).toEqual(false);
  });
  it('Should pass for 24 word mnemonic', () => {
    expect(failedSeedPhraseRequirements(VALID_24)).toEqual(false);
  });
  it('Should fail for 12 + 1 word mnemonic', () => {
    const plus_one = VALID_12 + ' lol';
    expect(failedSeedPhraseRequirements(plus_one)).toEqual(true);
  });
  it('Should fail for 24 + 1 word mnemonic', () => {
    const plus_one = VALID_24 + ' lol';
    expect(failedSeedPhraseRequirements(plus_one)).toEqual(true);
  });
});

describe('parseSeedPhrase', () => {
  it('Should handle leading spaces', () => {
    expect(parseSeedPhrase(`   ${VALID_12}`)).toEqual(VALID_12);
  });
  it('Should handle trailing spaces', () => {
    expect(parseSeedPhrase(`${VALID_12}   `)).toEqual(VALID_12);
  });
  it('Should handle additional spaces', () => {
    expect(parseSeedPhrase(`${VALID_12.split(' ').join('   ')}   `)).toEqual(
      VALID_12,
    );
  });
  it('Should handle uppercase', () => {
    expect(parseSeedPhrase(`   ${String(VALID_12).toUpperCase()}`)).toEqual(
      VALID_12,
    );
  });
});
