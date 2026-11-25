import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import { PackTile } from './PackTile';

const pack = mockHomePacks[0];

describe('PackTile', () => {
  it.each([
    [1, '1 open'],
    [2, '2 opens'],
    [20_000, '20,000 opens, trending'],
  ])('labels a count of %d as "%s"', (openedCount, label) => {
    render(<PackTile pack={{ ...pack, openedCount }} />);
    expect(screen.getByLabelText(label)).toBeOnTheScreen();
  });

  it('shows the formatted count', () => {
    render(<PackTile pack={{ ...pack, openedCount: 1234 }} />);
    expect(screen.getByText('1,234')).toBeOnTheScreen();
  });
});
