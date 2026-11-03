import { BoxBackgroundColor } from '@metamask/design-system-react-native';

import {
  ELEVATION_FILL,
  ElevationRole,
  resolveGlassMaterial,
} from './elevation';

describe('resolveGlassMaterial', () => {
  it('uses Liquid Glass when the OS can draw it and hardware is not low', () => {
    const material = resolveGlassMaterial({
      isGlassEnabled: true,
      isBlurEnabled: false,
      hardwareTier: 'HIGH',
      networkTier: 'WIFI',
    });

    expect(material).toBe('glass');
  });

  it('keeps the product material when hardware is unknown', () => {
    const material = resolveGlassMaterial({
      isGlassEnabled: true,
      isBlurEnabled: false,
      hardwareTier: null,
      networkTier: null,
    });

    expect(material).toBe('glass');
  });

  it('uses blur on older iOS when Liquid Glass is unavailable', () => {
    const material = resolveGlassMaterial({
      isGlassEnabled: false,
      isBlurEnabled: true,
      hardwareTier: 'MID',
      networkTier: 'FAST_CELLULAR',
    });

    expect(material).toBe('blur');
  });

  it('stays opaque when neither glass nor blur is available', () => {
    const material = resolveGlassMaterial({
      isGlassEnabled: false,
      isBlurEnabled: false,
      hardwareTier: 'HIGH',
      networkTier: 'WIFI',
    });

    expect(material).toBe('opaque');
  });

  it('skips glass and blur on low hardware', () => {
    const material = resolveGlassMaterial({
      isGlassEnabled: true,
      isBlurEnabled: true,
      hardwareTier: 'LOW',
      networkTier: 'WIFI',
    });

    expect(material).toBe('opaque');
  });

  it('does not change the material when the network tier changes', () => {
    const online = resolveGlassMaterial({
      isGlassEnabled: false,
      isBlurEnabled: true,
      hardwareTier: 'HIGH',
      networkTier: 'WIFI',
    });
    const offline = resolveGlassMaterial({
      isGlassEnabled: false,
      isBlurEnabled: true,
      hardwareTier: 'HIGH',
      networkTier: 'NONE',
    });

    expect(online).toBe(offline);
  });
});

describe('ELEVATION_FILL', () => {
  it('maps the page, cards, and sheets onto existing semantic tokens', () => {
    expect(ELEVATION_FILL[ElevationRole.Base].backgroundColor).toBe(
      BoxBackgroundColor.BackgroundDefault,
    );
    expect(ELEVATION_FILL[ElevationRole.Section].backgroundColor).toBe(
      BoxBackgroundColor.BackgroundSection,
    );
    expect(ELEVATION_FILL[ElevationRole.Subsection].backgroundColor).toBe(
      BoxBackgroundColor.BackgroundSubsection,
    );
    expect(ELEVATION_FILL[ElevationRole.Sheet].backgroundColor).toBe(
      BoxBackgroundColor.BackgroundElevated1,
    );
    expect(ELEVATION_FILL[ElevationRole.Floating].backgroundColor).toBe(
      BoxBackgroundColor.BackgroundElevated2,
    );
  });

  it('gives sheets and floating UI a hairline and leaves sections flat', () => {
    expect(ELEVATION_FILL[ElevationRole.Section].borderWidth).toBeUndefined();
    expect(ELEVATION_FILL[ElevationRole.Sheet].borderWidth).toBe(1);
    expect(ELEVATION_FILL[ElevationRole.Floating].shadow).toBe('md-light');
    expect(ELEVATION_FILL[ElevationRole.Sheet].shadow).toBe('lg');
  });
});
