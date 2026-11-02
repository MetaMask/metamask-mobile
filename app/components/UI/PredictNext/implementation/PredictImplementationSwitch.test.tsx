import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { PredictImplementationSwitch } from './PredictImplementationSwitch';
import { useActiveVenue } from './activeVenue';
import { NextVenueProvider, useNextVenueId } from './NextVenueContext';
import type { PredictVenueId } from '../types';
import type { ActiveVenueResolution } from './types';

jest.mock('./activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const mockUseActiveVenue = jest.mocked(useActiveVenue);
const mockMount = jest.fn();
const mockUnmount = jest.fn();

const Branch = ({ name }: { name: string }) => {
  useEffect(() => {
    mockMount(name);
    return () => mockUnmount(name);
  }, [name]);
  return <Text testID={name}>{name}</Text>;
};

const NextVenueProbe = () => (
  <Text testID="next-venue">{useNextVenueId()}</Text>
);

const renderSwitch = (props: { pinnedVenue?: 'polymarket' } = {}) => (
  <PredictImplementationSwitch
    {...props}
    legacy={<Branch name="legacy" />}
    next={<Branch name="next" />}
    resolving={<Branch name="resolving" />}
  />
);

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  mockUseActiveVenue.mockReturnValue(resolution);

describe('PredictImplementationSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders only the resolving state while the Active Venue resolves', () => {
    givenActiveVenue({ status: 'resolving' });

    render(renderSwitch());

    expect(screen.getByTestId('resolving')).toBeOnTheScreen();
    expect(mockMount.mock.calls).toEqual([['resolving']]);
  });

  it('mounts only the legacy branch for Polymarket', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });

    render(renderSwitch());

    expect(screen.getByTestId('legacy')).toBeOnTheScreen();
    expect(mockMount.mock.calls).toEqual([['legacy']]);
  });

  it('mounts only the next branch for Kalshi', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    render(renderSwitch());

    expect(screen.getByTestId('next')).toBeOnTheScreen();
    expect(mockMount.mock.calls).toEqual([['next']]);
  });

  it('hands the resolved Venue to the next branch', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    render(
      <PredictImplementationSwitch
        legacy={null}
        next={<NextVenueProbe />}
        resolving={null}
      />,
    );

    expect(screen.getByTestId('next-venue')).toHaveTextContent('kalshi');
  });

  it('reads a Venue only inside a NextVenueProvider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => render(<NextVenueProbe />)).toThrow(
      'useNextVenueId must be used within a NextVenueProvider',
    );
    expect(() =>
      render(
        <NextVenueProvider venueId={'test-venue' as PredictVenueId}>
          <NextVenueProbe />
        </NextVenueProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId('next-venue')).toHaveTextContent('test-venue');
    consoleError.mockRestore();
  });

  it('remounts when the Active Venue changes', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });
    const view = render(renderSwitch());

    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
    view.rerender(renderSwitch());

    expect(mockUnmount.mock.calls).toEqual([['legacy']]);
    expect(mockMount.mock.calls).toEqual([['legacy'], ['next']]);
    expect(screen.queryByTestId('legacy')).not.toBeOnTheScreen();
  });

  it('keeps the active branch mounted while the Active Venue is unchanged', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
    const view = render(renderSwitch());

    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });
    view.rerender(renderSwitch());

    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockUnmount).not.toHaveBeenCalled();
  });

  it.each<ActiveVenueResolution>([
    { status: 'resolving' },
    { status: 'ready', venue: 'kalshi', source: 'rollout' },
  ])('serves a pinned Venue regardless of the Active Venue', (active) => {
    givenActiveVenue(active);

    render(renderSwitch({ pinnedVenue: 'polymarket' }));

    expect(mockMount.mock.calls).toEqual([['legacy']]);
  });

  it('keeps the legacy branch mounted when pinning ends on the same implementation', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });
    const view = render(renderSwitch({ pinnedVenue: 'polymarket' }));

    view.rerender(renderSwitch());

    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockUnmount).not.toHaveBeenCalled();
  });
});
