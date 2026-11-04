import React, { createRef } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { SectionRefreshHandle } from '../../../Views/Homepage/types';
import type { PredictionsSectionProps } from '../../Predict/homeSection/predictionsSectionTypes';
import { useActiveVenue } from '../implementation/activeVenue';
import type { ActiveVenueResolution } from '../implementation/types';
import { PredictHomeSection } from './PredictHomeSection';

const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockLegacyProps = jest.fn();

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

jest.mock('../../Predict/homeSection', () => {
  const { forwardRef: mockForwardRef, useImperativeHandle } =
    jest.requireActual<typeof import('react')>('react');
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: mockForwardRef<SectionRefreshHandle, PredictionsSectionProps>(
      (props, ref) => {
        mockLegacyProps(props);
        useImperativeHandle(ref, () => ({ refresh: mockRefresh }));
        return <MockText testID="legacy-section">legacy</MockText>;
      },
    ),
  };
});

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

const renderSection = (ref = createRef<SectionRefreshHandle>()) => {
  render(
    <>
      <Text testID="homepage">homepage</Text>
      <PredictHomeSection
        ref={ref}
        sectionIndex={2}
        totalSectionsLoaded={5}
        mode="sports"
      />
    </>,
  );
  return ref;
};

describe('PredictHomeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the Homepage contract through to the legacy section for Polymarket', async () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });

    const ref = renderSection();

    expect(screen.getByTestId('legacy-section')).toBeOnTheScreen();
    expect(mockLegacyProps).toHaveBeenCalledWith({
      sectionIndex: 2,
      totalSectionsLoaded: 5,
      mode: 'sports',
    });
    await ref.current?.refresh();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it.each<[string, ActiveVenueResolution]>([
    [
      'Kalshi is active',
      { status: 'ready', venue: 'kalshi', source: 'rollout' },
    ],
    ['the Active Venue is resolving', { status: 'resolving' }],
  ])('renders nothing and leaves the ref empty while %s', (_, resolution) => {
    givenActiveVenue(resolution);

    const ref = renderSection();

    expect(screen.getByTestId('homepage')).toBeOnTheScreen();
    expect(screen.queryByTestId('legacy-section')).not.toBeOnTheScreen();
    expect(mockLegacyProps).not.toHaveBeenCalled();
    expect(ref.current).toBeNull();
  });
});
