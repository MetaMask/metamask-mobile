import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PerpBadges from './PerpBadges';

describe('PerpBadges', () => {
  it('renders a Long badge', () => {
    renderWithProvider(<PerpBadges direction="long" leverage={10} />);

    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('10x')).toBeOnTheScreen();
  });

  it('renders a Short badge', () => {
    renderWithProvider(<PerpBadges direction="short" leverage={5} />);

    expect(screen.getByText('Short')).toBeOnTheScreen();
    expect(screen.getByText('5x')).toBeOnTheScreen();
  });

  it('omits the leverage pill when leverage is null', () => {
    renderWithProvider(<PerpBadges direction="long" leverage={null} />);

    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.queryByText(/x$/u)).not.toBeOnTheScreen();
  });

  it('omits the leverage pill when leverage is undefined', () => {
    renderWithProvider(<PerpBadges direction="short" />);

    expect(screen.getByText('Short')).toBeOnTheScreen();
  });

  it('forwards the testID', () => {
    renderWithProvider(
      <PerpBadges direction="long" leverage={3} testID="my-badges" />,
    );

    expect(screen.getByTestId('my-badges')).toBeOnTheScreen();
  });
});
