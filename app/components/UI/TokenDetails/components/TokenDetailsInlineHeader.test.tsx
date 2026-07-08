import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('control group (useAmbientColor=false)', () => {
    it('renders back button even when iconColor is undefined', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor={false}
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('renders price alert button when onPriceAlertPress is provided', () => {
      const mockOnPriceAlertPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onPriceAlertPress={mockOnPriceAlertPress}
          useAmbientColor={false}
        />,
      );

      fireEvent.press(getByTestId('token-price-alert-button'));
      expect(mockOnPriceAlertPress).toHaveBeenCalledTimes(1);
    });

    it('does not render the price alert button when onPriceAlertPress is undefined', () => {
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      expect(queryByTestId('token-price-alert-button')).toBeNull();
    });

    it('renders share button and calls onSharePress when pressed', () => {
      const mockOnSharePress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onSharePress={mockOnSharePress}
          useAmbientColor={false}
        />,
      );

      fireEvent.press(getByTestId('share-button'));
      expect(mockOnSharePress).toHaveBeenCalledTimes(1);
    });

    it('does not render the share button when onSharePress is undefined', () => {
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor={false}
        />,
      );

      expect(queryByTestId('share-button')).toBeNull();
    });
  });

  describe('treatment group (useAmbientColor=true)', () => {
    it('does not render back button when iconColor is undefined', () => {
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          useAmbientColor
        />,
      );

      expect(queryByTestId('back-arrow-button')).not.toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('renders price alert button when iconColor is provided and onPriceAlertPress is set', () => {
      const mockOnPriceAlertPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onPriceAlertPress={mockOnPriceAlertPress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      fireEvent.press(getByTestId('token-price-alert-button'));
      expect(mockOnPriceAlertPress).toHaveBeenCalledTimes(1);
    });

    it('does not render the price alert button when iconColor is undefined', () => {
      const mockOnPriceAlertPress = jest.fn();
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onPriceAlertPress={mockOnPriceAlertPress}
          useAmbientColor
        />,
      );

      // shouldShowButton is false when useAmbientColor=true and iconColor is undefined,
      // so the price alert button must not be rendered even if the handler is provided
      expect(queryByTestId('token-price-alert-button')).toBeNull();
    });

    it('renders share button when iconColor is provided and onSharePress is set', () => {
      const mockOnSharePress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onSharePress={mockOnSharePress}
          iconColor={LIGHT_MODE_SUCCESS_GREEN}
          useAmbientColor
        />,
      );

      fireEvent.press(getByTestId('share-button'));
      expect(mockOnSharePress).toHaveBeenCalledTimes(1);
    });

    it('does not render the share button when iconColor is undefined', () => {
      const mockOnSharePress = jest.fn();
      const { queryByTestId } = render(
        <TokenDetailsInlineHeader
          onBackPress={mockOnBackPress}
          onSharePress={mockOnSharePress}
          useAmbientColor
        />,
      );

      expect(queryByTestId('share-button')).toBeNull();
    });
  });
});
