import React from 'react';
import { act, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import type { PackActivity } from '#app/components/UI/Collectibles/types/packs';
import { PackActivityLine } from '#app/components/UI/Collectibles/components/PackActivityLine';

const activity: PackActivity = {
  openerName: 'Lorem',
  otherOpeners: 1240,
  pullerName: 'Ipsum',
  pulledRarity: 'rare',
};

describe('PackActivityLine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with who opened the pack', () => {
    render(<PackActivityLine activity={activity} />);

    expect(
      screen.getByText('Opened by Lorem and 1.24K others'),
    ).toBeOnTheScreen();
  });

  it('rotates to the latest pull', () => {
    render(<PackActivityLine activity={activity} />);

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(screen.getByText('Ipsum pulled a Rare card')).toBeOnTheScreen();
  });
});
