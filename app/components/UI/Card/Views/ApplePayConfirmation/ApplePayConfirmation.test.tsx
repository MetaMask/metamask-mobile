import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AppThemeKey } from '../../../../../util/theme/models';
import { mockTheme } from '../../../../../util/theme';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ApplePayConfirmation from './ApplePayConfirmation';

const mockReset = jest.fn();
const mockAddListener = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
    addListener: mockAddListener,
  }),
}));

const getBeforeRemoveListener = () => {
  const listenerCall = mockAddListener.mock.calls.find(
    (call) => call[0] === 'beforeRemove',
  );

  return listenerCall?.[1] as (event: {
    preventDefault: () => void;
    data: { action: { type: string } };
  }) => void;
};

describe('ApplePayConfirmation', () => {
  beforeEach(() => {
    mockReset.mockClear();
    mockAddListener.mockReset();
    mockAddListener.mockReturnValue(jest.fn());
  });

  it('shows the success copy and light payment marks', () => {
    const { getByTestId } = renderWithProvider(<ApplePayConfirmation />);

    expect(getByTestId('apple-pay-confirmation-title')).toBeOnTheScreen();
    expect(
      getByTestId('apple-pay-confirmation-instructions'),
    ).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-marks-copy')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-graphic')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-hand')).toBeOnTheScreen();
    expect(getByTestId('apple-pay-confirmation-marks-light')).toBeOnTheScreen();
  });

  it('uses the dark payment marks', () => {
    const { getByTestId } = renderWithProvider(<ApplePayConfirmation />, {
      theme: { ...mockTheme, themeAppearance: AppThemeKey.dark },
    });

    expect(getByTestId('apple-pay-confirmation-marks-dark')).toBeOnTheScreen();
  });

  it('returns to Card Home when done', () => {
    const { getByTestId } = renderWithProvider(<ApplePayConfirmation />);

    fireEvent.press(getByTestId('apple-pay-confirmation-done'));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'CardHome' }],
    });
  });

  it('returns to Card Home when the screen is popped', () => {
    renderWithProvider(<ApplePayConfirmation />);

    const preventDefault = jest.fn();
    getBeforeRemoveListener()({
      preventDefault,
      data: { action: { type: 'POP' } },
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'CardHome' }],
    });
  });

  it('lets an intentional reset leave the screen', () => {
    renderWithProvider(<ApplePayConfirmation />);

    const preventDefault = jest.fn();
    getBeforeRemoveListener()({
      preventDefault,
      data: { action: { type: 'RESET' } },
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });
});
