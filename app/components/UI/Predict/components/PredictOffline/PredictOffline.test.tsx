import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictOffline from './PredictOffline';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

describe('PredictOffline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('displays error message with title and description', () => {
      renderWithProvider(<PredictOffline />);

      expect(screen.getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(
        screen.getByText("Couldn't connect to Predictions"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Check your connection and try again. If it continues, try a different network.',
        ),
      ).toBeOnTheScreen();
    });

    it('uses custom testID when provided', () => {
      renderWithProvider(<PredictOffline testID="custom-error-state" />);

      expect(screen.getByTestId('custom-error-state')).toBeOnTheScreen();
    });
  });

  describe('retry button', () => {
    it('displays retry button when onRetry callback is provided', () => {
      const onRetry = jest.fn();

      renderWithProvider(<PredictOffline onRetry={onRetry} />);

      expect(screen.getByText('Try again')).toBeOnTheScreen();
    });

    it('calls onRetry callback when retry button is pressed', () => {
      const onRetry = jest.fn();

      renderWithProvider(<PredictOffline onRetry={onRetry} />);

      fireEvent.press(screen.getByText('Try again'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('hides retry button when onRetry is not provided', () => {
      renderWithProvider(<PredictOffline />);

      expect(screen.queryByText('Try again')).not.toBeOnTheScreen();
    });
  });
});
