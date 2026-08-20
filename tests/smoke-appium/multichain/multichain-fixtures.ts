import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';

export function createSessionFixture() {
  return new FixtureBuilder()
    .withAutoLockDisabled()
    .withPopularNetworks()
    .build();
}
