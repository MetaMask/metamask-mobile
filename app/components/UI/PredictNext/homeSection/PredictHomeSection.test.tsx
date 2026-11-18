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

const mockNextProps = jest.fn();
const mockNextRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('./internal/next/NextPredictHomeSection', () => {
  const { forwardRef: mockForwardRef, useImperativeHandle } =
    jest.requireActual<typeof import('react')>('react');
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    NextPredictHomeSection: mockForwardRef<
      SectionRefreshHandle,
      { sectionIndex: number; totalSectionsLoaded: number; mode?: string }
    >((props, ref) => {
      mockNextProps(props);
      useImperativeHandle(ref, () => ({ refresh: mockNextRefresh }));
      return <MockText testID="next-section">next</MockText>;
    }),
  };
});

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

const renderSection = (
  mode: 'default' | 'sports' = 'sports',
  ref = createRef<SectionRefreshHandle>(),
) => {
  render(
    <>
      <Text testID="homepage">homepage</Text>
      <PredictHomeSection
        ref={ref}
        sectionIndex={2}
        totalSectionsLoaded={5}
        mode={mode}
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

  it('renders the next section with the Homepage contract for Kalshi', async () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    const ref = renderSection('default');

    expect(screen.getByTestId('next-section')).toBeOnTheScreen();
    expect(screen.queryByTestId('legacy-section')).not.toBeOnTheScreen();
    expect(mockLegacyProps).not.toHaveBeenCalled();
    expect(mockNextProps).toHaveBeenCalledWith({
      sectionIndex: 2,
      totalSectionsLoaded: 5,
      mode: 'default',
    });
    await ref.current?.refresh();
    expect(mockNextRefresh).toHaveBeenCalledTimes(1);
  });

  it('passes sports mode through to the next section for Kalshi', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    renderSection('sports');

    expect(screen.getByTestId('next-section')).toBeOnTheScreen();
    expect(mockNextProps).toHaveBeenCalledWith({
      sectionIndex: 2,
      totalSectionsLoaded: 5,
      mode: 'sports',
    });
  });

  it.each<[string, ActiveVenueResolution, 'default' | 'sports']>([
    ['the Active Venue is resolving', { status: 'resolving' }, 'default'],
  ])(
    'renders nothing and leaves the ref empty while %s',
    (_, resolution, mode) => {
      givenActiveVenue(resolution);

      const ref = renderSection(mode);

      expect(screen.getByTestId('homepage')).toBeOnTheScreen();
      expect(screen.queryByTestId('legacy-section')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('next-section')).not.toBeOnTheScreen();
      expect(mockLegacyProps).not.toHaveBeenCalled();
      expect(ref.current).toBeNull();
    },
  );
});
