import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  PredictEntryPointProvider,
  usePredictEntryPoint,
} from './PredictEntryPointContext';
import { PredictEventValues } from '../constants/eventNames';

const TestComponent = () => {
  const entryPoint = usePredictEntryPoint();
  return <Text testID="entry-point">{entryPoint ?? 'undefined'}</Text>;
};

describe('PredictEntryPointContext', () => {
  describe('usePredictEntryPoint', () => {
    it('returns undefined when no provider is present', () => {
      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('entry-point').props.children).toBe('undefined');
    });

    it('returns entry point value when provider is present', () => {
      const { getByTestId } = render(
        <PredictEntryPointProvider
          entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED}
        >
          <TestComponent />
        </PredictEntryPointProvider>,
      );

      expect(getByTestId('entry-point').props.children).toBe(
        'homepage_featured',
      );
    });
  });

  describe('PredictEntryPointProvider', () => {
    it('provides the entry point to nested components', () => {
      const { getByTestId } = render(
        <PredictEntryPointProvider
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        >
          <TestComponent />
        </PredictEntryPointProvider>,
      );

      expect(getByTestId('entry-point').props.children).toBe('predict_feed');
    });

    it('provides entry point to deeply nested components', () => {
      const DeepNestedComponent = () => (
        <PredictEntryPointProvider
          entryPoint={PredictEventValues.ENTRY_POINT.TRENDING}
        >
          <TestComponent />
        </PredictEntryPointProvider>
      );

      const { getByTestId } = render(<DeepNestedComponent />);

      expect(getByTestId('entry-point').props.children).toBe('trending');
    });

    it('inner provider overrides outer provider value', () => {
      const { getByTestId } = render(
        <PredictEntryPointProvider
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        >
          <PredictEntryPointProvider
            entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED}
          >
            <TestComponent />
          </PredictEntryPointProvider>
        </PredictEntryPointProvider>,
      );

      expect(getByTestId('entry-point').props.children).toBe(
        'homepage_featured',
      );
    });

    it('handles all entry point values', () => {
      const entryPointValues = [
        PredictEventValues.ENTRY_POINT.CAROUSEL,
        PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        PredictEventValues.ENTRY_POINT.SEARCH,
        PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        PredictEventValues.ENTRY_POINT.HOMEPAGE_NEW_PREDICTION,
        PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
        PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
        PredictEventValues.ENTRY_POINT.TRENDING,
      ];

      entryPointValues.forEach((entryPoint) => {
        const { getByTestId, unmount } = render(
          <PredictEntryPointProvider entryPoint={entryPoint}>
            <TestComponent />
          </PredictEntryPointProvider>,
        );

        expect(getByTestId('entry-point').props.children).toBe(entryPoint);
        unmount();
      });
    });
  });
});
