import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictHomeFeatured from './PredictHomeFeatured';

// Mock the selector
const mockSelectPredictHomeFeaturedVariant = jest.fn();
jest.mock('../../selectors/featureFlags', () => ({
  selectPredictHomeFeaturedVariant: (state: unknown) =>
    mockSelectPredictHomeFeaturedVariant(state),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

// Mock child components
jest.mock('./PredictHomeFeaturedCarousel', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <ReactNative.View testID={testID || 'carousel'}>
        <ReactNative.Text>Carousel</ReactNative.Text>
      </ReactNative.View>
    ),
  };
});

jest.mock('./PredictHomeFeaturedList', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <ReactNative.View testID={testID || 'list'}>
        <ReactNative.Text>List</ReactNative.Text>
      </ReactNative.View>
    ),
  };
});

describe('PredictHomeFeatured', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('variant routing', () => {
    it('renders carousel when variant is carousel', () => {
      mockSelectPredictHomeFeaturedVariant.mockReturnValue('carousel');

      render(<PredictHomeFeatured />);

      expect(screen.getByText('Carousel')).toBeOnTheScreen();
    });

    it('renders list when variant is list', () => {
      mockSelectPredictHomeFeaturedVariant.mockReturnValue('list');

      render(<PredictHomeFeatured />);

      expect(screen.getByText('List')).toBeOnTheScreen();
    });

    it('defaults to carousel when variant is undefined', () => {
      mockSelectPredictHomeFeaturedVariant.mockReturnValue(undefined);

      render(<PredictHomeFeatured />);

      expect(screen.getByText('Carousel')).toBeOnTheScreen();
    });
  });

  describe('testID prop', () => {
    it('passes testID to carousel component', () => {
      mockSelectPredictHomeFeaturedVariant.mockReturnValue('carousel');

      render(<PredictHomeFeatured testID="custom-test-id" />);

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });

    it('passes testID to list component', () => {
      mockSelectPredictHomeFeaturedVariant.mockReturnValue('list');

      render(<PredictHomeFeatured testID="custom-test-id" />);

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });
});
