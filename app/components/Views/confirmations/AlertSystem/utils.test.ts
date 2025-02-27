import { ThemeColors } from '@metamask/design-tokens';
import { Severity } from '../types/alerts';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner';
import { getSeverityStyle, getBannerAlertSeverity } from './utils';

describe('getSeverityStyle', () => {
  const mockColors = {
    background: {
      default: 'white',
    },
    error: {
      default: 'red',
      muted: 'lightred',
    },
    warning: {
      default: 'yellow',
      muted: 'lightyellow',
    },
    info: {
      default: 'blue',
      muted: 'lightblue',
    },
  } as ThemeColors;

  it('returns the correct style for Warning severity', () => {
    const result = getSeverityStyle(Severity.Warning, mockColors);
    expect(result).toEqual({
      background: mockColors.warning.muted,
      icon: mockColors.warning.default,
    });
  });

  it('returns the correct style for Danger severity', () => {
    const result = getSeverityStyle(Severity.Danger, mockColors);
    expect(result).toEqual({
      background: mockColors.error.muted,
      icon: mockColors.error.default,
    });
  });

  it('returns the correct style for default severity', () => {
    const result = getSeverityStyle(Severity.Info, mockColors);
    expect(result).toEqual({
      background: mockColors.background.default,
      icon: mockColors.info.default,
    });
  });
});

describe('getBannerAlertSeverity', () => {
  it('returns the correct BannerAlertSeverity for Danger severity', () => {
    const result = getBannerAlertSeverity(Severity.Danger);
    expect(result).toBe(BannerAlertSeverity.Error);
  });

  it('returns the correct BannerAlertSeverity for Warning severity', () => {
    const result = getBannerAlertSeverity(Severity.Warning);
    expect(result).toBe(BannerAlertSeverity.Warning);
  });

  it('returns the correct BannerAlertSeverity for default severity', () => {
    const result = getBannerAlertSeverity(Severity.Info);
    expect(result).toBe(BannerAlertSeverity.Info);
  });
});
