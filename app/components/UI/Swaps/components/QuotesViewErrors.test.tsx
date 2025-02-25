import React from 'react';
import { swapsUtils } from '@metamask/swaps-controller';
import { render } from '@testing-library/react-native';
import { ErrorIcon, getErrorItems } from './QuotesViewErrors';

describe('QuotesViewErrors', () => {
  describe('ErrorIcon', () => {
    it('should render clock icon for expired quotes error', () => {
      const { getByTestId } = render(
        <ErrorIcon errorKey={swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR} />,
      );

      expect(getByTestId('clock-outline')).toBeDefined();
    });

    it('should render alert icon for other errors', () => {
      const { getByTestId } = render(
        <ErrorIcon errorKey={swapsUtils.SwapsError.QUOTES_NOT_AVAILABLE_ERROR} />,
      );

      expect(getByTestId('alert-outline')).toBeDefined();
    });
  });

  describe('getErrorItems', () => {
    it('should return error details when not in polling and error exists', () => {
      const errorKey = swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR;
      const result = getErrorItems(false, errorKey);

      expect(result).toEqual({
        errorIcon: expect.any(Object), // React element
        errorTitle: expect.any(String),
        errorMessage: expect.any(String),
        errorAction: expect.any(String),
      });
    });

    it('should return empty error details when in polling', () => {
      const result = getErrorItems(true, swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR);

      expect(result).toEqual({
        errorIcon: undefined,
        errorTitle: undefined,
        errorMessage: undefined,
        errorAction: undefined,
      });
    });

    it('should return empty error details when no error key is provided', () => {
      const result = getErrorItems(false, '');

      expect(result).toEqual({
        errorIcon: undefined,
        errorTitle: undefined,
        errorMessage: undefined,
        errorAction: undefined,
      });
    });

    it('should include the correct icon for the error type', () => {
      // Test with expired quotes error
      const resultExpired = getErrorItems(false, swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR);
      const { getByTestId } = render(resultExpired.errorIcon as React.ReactElement);
      expect(getByTestId('clock-outline')).toBeDefined();

      // Test with other error
      const resultOther = getErrorItems(false, swapsUtils.SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
      const { getByTestId: getByTestIdOther } = render(resultOther.errorIcon as React.ReactElement);
      expect(getByTestIdOther('alert-outline')).toBeDefined();
    });
  });
});
