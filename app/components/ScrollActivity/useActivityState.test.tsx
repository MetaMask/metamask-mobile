import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getHardwareTier } from '../../util/deviceCapability';
import { ActivityScrollView, ActivitySlot, useActivityState } from './index';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'LOW'),
}));

function RestoredSection() {
  const [period, setPeriod] = useActivityState('period', '1h');
  const [draft, setDraft] = useState('local-a');

  return (
    <>
      <Text testID="period">{period}</Text>
      <Text testID="draft">{draft}</Text>
      <Pressable
        testID="update-state"
        onPress={() => {
          setPeriod('1d');
          setDraft('local-b');
        }}
      />
    </>
  );
}

function StateProbe() {
  useActivityState('period', '1h');
  return null;
}

function scrollContent(y: number) {
  fireEvent.scroll(screen.getByTestId('activity-scroll'), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 320, height: 800 },
      layoutMeasurement: { width: 320, height: 100 },
    },
  });
}

describe('useActivityState', () => {
  beforeEach(() => {
    jest.mocked(getHardwareTier).mockReturnValue('LOW');
  });

  it('restores declared state after dormancy and drops undeclared state', () => {
    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="chart" estimatedHeight={100}>
          <RestoredSection />
        </ActivitySlot>
      </ActivityScrollView>,
    );
    fireEvent(screen.getByTestId('activity-scroll'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });
    fireEvent.press(screen.getByTestId('update-state'));
    scrollContent(200);

    expect(screen.queryByTestId('period')).toBeNull();

    scrollContent(0);

    expect(screen.getByTestId('period')).toHaveTextContent('1d');
    expect(screen.getByTestId('draft')).toHaveTextContent('local-a');
  });

  it('replaces a stored value instead of deep-merging it', () => {
    function FilterSection() {
      const [filters, setFilters] = useActivityState('filters', {
        tab: 'positions',
        expanded: true,
      });

      return (
        <>
          <Text testID="filters">{JSON.stringify(filters)}</Text>
          <Pressable
            testID="replace-filters"
            onPress={() => {
              setFilters({ tab: 'orders', expanded: false });
            }}
          />
        </>
      );
    }

    render(
      <ActivityScrollView testID="activity-scroll">
        <ActivitySlot id="filters" estimatedHeight={40}>
          <FilterSection />
        </ActivitySlot>
      </ActivityScrollView>,
    );
    fireEvent.press(screen.getByTestId('replace-filters'));

    expect(screen.getByTestId('filters')).toHaveTextContent(
      '{"tab":"orders","expanded":false}',
    );
  });

  it('throws when there is no ActivityScrollView', () => {
    expect(() => render(<StateProbe />)).toThrow(
      'useActivityState must be used within ActivityScrollView',
    );
  });

  it('throws when there is no ActivitySlot', () => {
    expect(() =>
      render(
        <ActivityScrollView>
          <StateProbe />
        </ActivityScrollView>,
      ),
    ).toThrow('useActivityState must be used within ActivitySlot');
  });
});
