import { pickRoutableCardLink, resolveCardEntryRouting } from './cardLinks';
import type { CardLink } from '../types';

const link = (
  provider: CardLink['provider'],
  status: CardLink['status'],
): CardLink => ({
  provider,
  status,
  linkedAccountRef: null,
  closedReason: null,
  migratedToProvider: null,
  linkedAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

describe('pickRoutableCardLink', () => {
  it('returns null for no links', () => {
    expect(pickRoutableCardLink(null)).toBeNull();
    expect(pickRoutableCardLink([])).toBeNull();
  });

  it('prefers an active row over an onboarding row', () => {
    expect(
      pickRoutableCardLink([
        link('baanx', 'onboarding'),
        link('immersve', 'active'),
      ]),
    ).toStrictEqual(link('immersve', 'active'));
  });

  it('ignores closed rows', () => {
    expect(pickRoutableCardLink([link('baanx', 'closed')])).toBeNull();
  });
});

describe('resolveCardEntryRouting', () => {
  it('uses the legacy label when the flag is off', () => {
    expect(
      resolveCardEntryRouting({
        cardLinkApiEnabled: false,
        cardLinks: [link('immersve', 'active')],
        hasLegacyCardholder: false,
      }),
    ).toStrictEqual({
      hasCard: false,
      provider: null,
      source: 'legacy',
      disagreesWithLegacy: false,
    });
  });

  it('uses the legacy label before links are fetched', () => {
    expect(
      resolveCardEntryRouting({
        cardLinkApiEnabled: true,
        cardLinks: null,
        hasLegacyCardholder: true,
      }),
    ).toMatchObject({ hasCard: true, source: 'legacy' });
  });

  it('uses the legacy label when the API returned no links, and flags the disagreement', () => {
    expect(
      resolveCardEntryRouting({
        cardLinkApiEnabled: true,
        cardLinks: [],
        hasLegacyCardholder: true,
      }),
    ).toStrictEqual({
      hasCard: true,
      provider: null,
      source: 'legacy',
      disagreesWithLegacy: true,
    });
  });

  it('lets the links decide once any exist', () => {
    expect(
      resolveCardEntryRouting({
        cardLinkApiEnabled: true,
        cardLinks: [link('baanx', 'closed'), link('immersve', 'active')],
        hasLegacyCardholder: true,
      }),
    ).toStrictEqual({
      hasCard: true,
      provider: 'immersve',
      source: 'card_links',
      disagreesWithLegacy: false,
    });
  });

  it('routes to sign-up when every link is closed, even with a positive label', () => {
    expect(
      resolveCardEntryRouting({
        cardLinkApiEnabled: true,
        cardLinks: [link('baanx', 'closed')],
        hasLegacyCardholder: true,
      }),
    ).toStrictEqual({
      hasCard: false,
      provider: null,
      source: 'card_links',
      disagreesWithLegacy: true,
    });
  });
});
