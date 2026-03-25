import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import type { Fixture } from '../../framework/fixtures/types';

type FixtureFn = (fb: FixtureBuilder) => FixtureBuilder;

/**
 * Base fixtures — the starting point for a FixtureBuilder chain.
 */
const bases: Record<string, () => FixtureBuilder> = {
  default: () => new FixtureBuilder().withDefaultFixture(),
  onboarding: () => new FixtureBuilder({ onboarding: true }),
};

/**
 * Modifiers — applied in order on top of a base.
 * Each modifier receives a FixtureBuilder and returns a FixtureBuilder.
 */
const modifiers: Record<string, FixtureFn> = {
  'with-multiple-accounts': (fb) =>
    fb.withKeyringControllerOfMultipleAccounts(),
  'with-metametrics': (fb) => fb.withMetaMetricsOptIn(),
  'with-clean-banners': (fb) => fb.withCleanBannerState(),
};

/**
 * Build a Fixture from a colon-delimited tag string.
 *
 * @param tag - e.g. "fixture:default:with-multiple-accounts"
 * @returns Built Fixture object ready for FixtureServer.loadJsonState()
 * @throws If the base or any modifier is unknown
 */
export function buildFromTag(tag: string): Fixture {
  const segments = tag.split(':');
  const prefix = segments.shift();

  if (prefix !== 'fixture') {
    throw new Error(
      `Invalid fixture tag: "${tag}" — must start with "fixture:"`,
    );
  }

  const baseName = segments.shift();
  if (!baseName || !bases[baseName]) {
    const available = Object.keys(bases).join(', ');
    throw new Error(
      `Unknown fixture base: "${baseName}" in tag "${tag}". Available: ${available}`,
    );
  }

  let fb = bases[baseName]();

  for (const mod of segments) {
    if (!modifiers[mod]) {
      const available = Object.keys(modifiers).join(', ');
      throw new Error(
        `Unknown fixture modifier: "${mod}" in tag "${tag}". Available: ${available}`,
      );
    }
    fb = modifiers[mod](fb);
  }

  return fb.build();
}

export { bases, modifiers };
