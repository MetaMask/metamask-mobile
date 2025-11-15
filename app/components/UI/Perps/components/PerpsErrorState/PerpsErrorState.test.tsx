import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsErrorState, { PerpsErrorType } from './PerpsErrorState';
import { strings } from '../../../../../../locales/i18n';

describe('PerpsErrorState', () => {
  describe('CONNECTION_FAILED error type', () => {
    it('should render connection failed error with retry button', () => {
      const onRetryMock = jest.fn();
      const { getByText } = render(
        <PerpsErrorState
          errorType={PerpsErrorType.CONNECTION_FAILED}
          onRetry={onRetryMock}
        />,
      );

      expect(
        getByText(strings('perps.errors.connectionFailed.title')),
      ).toBeTruthy();
      expect(
        getByText(strings('perps.errors.connectionFailed.description')),
      ).toBeTruthy();

      const retryButton = getByText(
        strings('perps.errors.connectionFailed.retry'),
      );
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('should render connection failed without retry when onRetry not provided', () => {
      const { getByText, queryByText } = render(
        <PerpsErrorState errorType={PerpsErrorType.CONNECTION_FAILED} />,
      );

      expect(
        getByText(strings('perps.errors.connectionFailed.title')),
      ).toBeTruthy();
      expect(
        queryByText(strings('perps.errors.connectionFailed.retry')),
      ).toBeNull();
    });
  });

  describe('NETWORK_ERROR error type', () => {
    it('should render network error with retry button', () => {
      const onRetryMock = jest.fn();
      const { getByText } = render(
        <PerpsErrorState
          errorType={PerpsErrorType.NETWORK_ERROR}
          onRetry={onRetryMock}
        />,
      );

      expect(
        getByText(strings('perps.errors.networkError.title')),
      ).toBeTruthy();
      expect(
        getByText(strings('perps.errors.networkError.description')),
      ).toBeTruthy();

      const retryButton = getByText(strings('perps.errors.networkError.retry'));
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('UNKNOWN error type', () => {
    it('should render unknown error with retry button when onRetry provided', () => {
      const onRetryMock = jest.fn();
      const { getByText } = render(
        <PerpsErrorState
          errorType={PerpsErrorType.UNKNOWN}
          onRetry={onRetryMock}
        />,
      );

      expect(getByText(strings('perps.errors.unknown.title'))).toBeTruthy();
      expect(
        getByText(strings('perps.errors.unknown.description')),
      ).toBeTruthy();

      const retryButton = getByText(strings('perps.errors.unknown.retry'));
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('should render unknown error without retry button when onRetry not provided', () => {
      const { getByText, queryByText } = render(
        <PerpsErrorState errorType={PerpsErrorType.UNKNOWN} />,
      );

      expect(getByText(strings('perps.errors.unknown.title'))).toBeTruthy();
      expect(
        getByText(strings('perps.errors.unknown.description')),
      ).toBeTruthy();
      expect(queryByText(strings('perps.errors.unknown.retry'))).toBeNull();
    });
  });

  describe('Default behavior', () => {
    it('should default to UNKNOWN error type when no errorType provided', () => {
      const { getByText } = render(<PerpsErrorState />);

      expect(getByText(strings('perps.errors.unknown.title'))).toBeTruthy();
      expect(
        getByText(strings('perps.errors.unknown.description')),
      ).toBeTruthy();
    });

    it('should use default testID when not provided', () => {
      const { getByTestId } = render(<PerpsErrorState />);
      expect(getByTestId('perps-error-state')).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      const { getByTestId } = render(
        <PerpsErrorState testID="custom-error-state" />,
      );
      expect(getByTestId('custom-error-state')).toBeTruthy();
    });
  });
});
