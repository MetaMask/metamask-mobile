import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PredictHttpsUrl, PredictTeam } from '../../../types';
import { TeamLogo } from './TeamLogo';

// The logo is decorative and hidden from assistive technology.
const HIDDEN = { includeHiddenElements: true };

const team = (logoUrl?: string): PredictTeam => ({
  name: 'Carolina Panthers',
  abbreviation: 'CAR',
  logoUrl: logoUrl as PredictHttpsUrl | undefined,
});

const renderLogo = (
  value: PredictTeam,
  size?: React.ComponentProps<typeof TeamLogo>['size'],
) =>
  render(
    <TeamLogo
      team={value}
      abbreviation="CAR"
      size={size}
      testID="logo"
      fallbackTestID="logo-fallback"
    />,
  );

describe('TeamLogo', () => {
  it('shows the Team logo', () => {
    renderLogo(team('https://example.com/car.png'));

    expect(screen.getByTestId('logo', HIDDEN)).toBeOnTheScreen();
    expect(screen.queryByTestId('logo-fallback', HIDDEN)).toBeNull();
  });

  it('mirrors the logo when flipped', () => {
    render(
      <TeamLogo
        team={team('https://example.com/car.png')}
        abbreviation="CAR"
        flipped
        testID="logo"
      />,
    );

    expect(screen.getByTestId('logo', HIDDEN)).toHaveStyle({
      transform: [{ scaleX: -1 }],
    });
  });

  it('does not mirror the abbreviation when a flipped logo fails to load', () => {
    render(
      <TeamLogo
        team={team('https://example.com/car.png')}
        abbreviation="CAR"
        flipped
        testID="logo"
        fallbackTestID="logo-fallback"
      />,
    );

    fireEvent(screen.getByTestId('logo', HIDDEN), 'error');

    const fallback = screen.getByTestId('logo-fallback', HIDDEN);
    expect(fallback).toHaveTextContent('CAR');
    expect(fallback).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(screen.queryByTestId('logo', HIDDEN)).toBeNull();
  });

  it('shows the abbreviation when the Team has no logo', () => {
    renderLogo(team());

    expect(screen.getByTestId('logo-fallback', HIDDEN)).toHaveTextContent(
      'CAR',
    );
    expect(screen.queryByTestId('logo', HIDDEN)).toBeNull();
  });

  it('falls back to the abbreviation when the logo fails to load', () => {
    renderLogo(team('https://example.com/car.png'));

    fireEvent(screen.getByTestId('logo', HIDDEN), 'error');

    expect(screen.getByTestId('logo-fallback', HIDDEN)).toHaveTextContent(
      'CAR',
    );
  });

  it('renders the largeWide size at 52x48', () => {
    renderLogo(team('https://example.com/car.png'), 'largeWide');

    expect(screen.getByTestId('logo', HIDDEN)).toHaveStyle({
      width: 52,
      height: 48,
    });
  });

  it.each([
    ['small', 32],
    ['medium', 40],
    ['large', 48],
    ['xlarge', 56],
  ] as const)('renders the %s size at %ipx', (size, pixels) => {
    renderLogo(team('https://example.com/car.png'), size);

    expect(screen.getByTestId('logo', HIDDEN)).toHaveStyle({
      width: pixels,
      height: pixels,
    });
  });
});
