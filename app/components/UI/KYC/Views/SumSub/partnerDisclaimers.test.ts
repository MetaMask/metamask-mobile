import {
  findDisclaimerByKeyword,
  groupDisclaimers,
} from './partnerDisclaimers';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';

const disclaimer = (id: string, key: string): KycCatalogDisclaimerLink => ({
  id,
  key,
  version: '1',
  title: key,
  url: `https://example.test/${key}`,
});

describe('groupDisclaimers', () => {
  it('splits the flattened catalog back into its two groups, in order', () => {
    const idosTerms = disclaimer('idOS:terms', 'idos-terms');
    const idosPrivacy = disclaimer('idOS:privacy', 'idos-privacy');
    const sumsubNotice = disclaimer('kycProvider:notice', 'sumsub-notice');

    expect(
      groupDisclaimers([idosTerms, sumsubNotice, idosPrivacy]),
    ).toStrictEqual({
      idos: [idosTerms, idosPrivacy],
      kycProvider: [sumsubNotice],
    });
  });

  it('returns empty groups for an empty catalog', () => {
    expect(groupDisclaimers([])).toStrictEqual({ idos: [], kycProvider: [] });
  });

  it('ignores documents from an unknown group', () => {
    expect(
      groupDisclaimers([disclaimer('vendor:terms', 'iron-terms')]),
    ).toStrictEqual({ idos: [], kycProvider: [] });
  });
});

describe('findDisclaimerByKeyword', () => {
  const idosTerms = disclaimer('idOS:terms', 'idos-terms-and-conditions');
  const idosPrivacy = disclaimer('idOS:privacy', 'idos-PRIVACY-policy');

  it('matches a document key case-insensitively', () => {
    expect(findDisclaimerByKeyword([idosTerms, idosPrivacy], 'privacy')).toBe(
      idosPrivacy,
    );
  });

  it('returns the first match when several keys contain the keyword', () => {
    const otherPrivacy = disclaimer('idOS:privacy-2', 'idos-privacy-notice');

    expect(
      findDisclaimerByKeyword([idosPrivacy, otherPrivacy], 'privacy'),
    ).toBe(idosPrivacy);
  });

  it('returns undefined when the backend renamed the key', () => {
    expect(findDisclaimerByKeyword([idosTerms], 'privacy')).toBeUndefined();
  });
});
