import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { RouteProp } from '@react-navigation/native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';
import EnterPasswordSimple from '.';

const mockGoBack = jest.fn();
const mockOnPasswordSet = jest.fn();
const mockOnCancel = jest.fn();

const renderView = () =>
  renderWithProvider(
    <EnterPasswordSimple
      navigation={
        {
          goBack: mockGoBack,
        } as unknown as AppNavigationProp
      }
      route={
        {
          key: 'EnterPasswordSimple',
          name: 'EnterPasswordSimple',
          params: {
            onPasswordSet: mockOnPasswordSet,
            onCancel: mockOnCancel,
          },
        } as RouteProp<RootStackParamList, 'EnterPasswordSimple'>
      }
    />,
  );

describe('EnterPasswordSimple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Settings design-system layout', () => {
    const { getByText, getByTestId } = renderView();

    expect(getByText('Enter your password')).toBeOnTheScreen();
    expect(getByText('Enter the password for this wallet.')).toBeOnTheScreen();
    expect(getByTestId('enter-password-simple-input')).toBeOnTheScreen();
    expect(getByTestId('enter-password-simple-confirm-button')).toBeDisabled();
  });

  it('accepts the prototype password and continues', async () => {
    const { getByTestId } = renderView();

    fireEvent.changeText(
      getByTestId('enter-password-simple-input'),
      'password',
    );
    fireEvent.press(getByTestId('enter-password-simple-confirm-button'));

    await waitFor(() =>
      expect(mockOnPasswordSet).toHaveBeenCalledWith('password'),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('goes back from the header', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId('enter-password-simple-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
