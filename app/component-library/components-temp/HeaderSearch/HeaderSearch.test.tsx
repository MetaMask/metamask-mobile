// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { strings } from '../../../../locales/i18n';

// Internal dependencies.
import HeaderSearch from './HeaderSearch';
import { HeaderSearchVariant } from './HeaderSearch.types';

const mockTextFieldSearchProps = {
  value: '',
  onChangeText: jest.fn(),
  onPressClearButton: jest.fn(),
  placeholder: 'Search...',
};

describe('HeaderSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen variant', () => {
    it('renders correctly with screen variant', () => {
      const onPressBackButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          backButtonProps={{ testID: 'back-button' }}
        />,
      );

      expect(getByTestId('back-button')).toBeOnTheScreen();
    });

    it('renders with testID', () => {
      const onPressBackButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          testID="header-search"
        />,
      );

      expect(getByTestId('header-search')).toBeOnTheScreen();
    });

    it('calls onPressBackButton when back button is pressed', () => {
      const onPressBackButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          backButtonProps={{ testID: 'back-button' }}
        />,
      );

      fireEvent.press(getByTestId('back-button'));

      expect(onPressBackButton).toHaveBeenCalledTimes(1);
    });

    it('forwards backButtonProps to ButtonIcon', () => {
      const onPressBackButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          backButtonProps={{ testID: 'custom-back-button' }}
        />,
      );

      expect(getByTestId('custom-back-button')).toBeOnTheScreen();
    });

    it('renders TextFieldSearch with provided props', () => {
      const onPressBackButton = jest.fn();
      const { getByPlaceholderText } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={{
            ...mockTextFieldSearchProps,
            placeholder: 'Custom placeholder',
          }}
        />,
      );

      expect(getByPlaceholderText('Custom placeholder')).toBeOnTheScreen();
    });
  });

  describe('Inline variant', () => {
    it('renders correctly with inline variant', () => {
      const onPressCancelButton = jest.fn();
      const { getByText } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={mockTextFieldSearchProps}
        />,
      );

      expect(getByText(strings('browser.cancel'))).toBeOnTheScreen();
    });

    it('renders with testID', () => {
      const onPressCancelButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          testID="header-search-inline"
        />,
      );

      expect(getByTestId('header-search-inline')).toBeOnTheScreen();
    });

    it('calls onPressCancelButton when cancel button is pressed', () => {
      const onPressCancelButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          cancelButtonProps={{ testID: 'cancel-button' }}
        />,
      );

      fireEvent.press(getByTestId('cancel-button'));

      expect(onPressCancelButton).toHaveBeenCalledTimes(1);
    });

    it('forwards cancelButtonProps to Button', () => {
      const onPressCancelButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          cancelButtonProps={{ testID: 'custom-cancel-button' }}
        />,
      );

      expect(getByTestId('custom-cancel-button')).toBeOnTheScreen();
    });

    it('renders TextFieldSearch with provided props', () => {
      const onPressCancelButton = jest.fn();
      const { getByPlaceholderText } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={{
            ...mockTextFieldSearchProps,
            placeholder: 'Search inline',
          }}
        />,
      );

      expect(getByPlaceholderText('Search inline')).toBeOnTheScreen();
    });
  });

  describe('BoxProps forwarding', () => {
    it('forwards twClassName to container for screen variant', () => {
      const onPressBackButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Screen}
          onPressBackButton={onPressBackButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          testID="container"
          twClassName="bg-error-default"
        />,
      );

      expect(getByTestId('container')).toBeOnTheScreen();
    });

    it('forwards twClassName to container for inline variant', () => {
      const onPressCancelButton = jest.fn();
      const { getByTestId } = render(
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onPressCancelButton}
          textFieldSearchProps={mockTextFieldSearchProps}
          testID="container"
          twClassName="bg-error-default"
        />,
      );

      expect(getByTestId('container')).toBeOnTheScreen();
    });
  });
});
