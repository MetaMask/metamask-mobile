import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  DismissableBanner,
  DISMISSABLE_BANNER_TEST_ID,
  DISMISSABLE_BANNER_DISMISS_TEST_ID,
} from './DismissableBanner';

const defaultProps = {
  title: 'Banner title',
  description: 'Banner description',
  onPress: jest.fn(),
  onDismiss: jest.fn(),
};

describe('DismissableBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and description', () => {
    const { getByText } = renderWithProvider(
      <DismissableBanner {...defaultProps} />,
    );

    expect(getByText('Banner title')).toBeOnTheScreen();
    expect(getByText('Banner description')).toBeOnTheScreen();
  });

  it('renders the icon when provided', () => {
    const { getByTestId } = renderWithProvider(
      <DismissableBanner
        {...defaultProps}
        icon={<Text testID="custom-icon">icon</Text>}
      />,
    );

    expect(getByTestId('custom-icon')).toBeOnTheScreen();
  });

  it('does not render an icon when none is provided', () => {
    const { queryByTestId } = renderWithProvider(
      <DismissableBanner {...defaultProps} />,
    );

    expect(queryByTestId('custom-icon')).not.toBeOnTheScreen();
  });

  it('calls onPress when the banner is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <DismissableBanner {...defaultProps} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(DISMISSABLE_BANNER_TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the close button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderWithProvider(
      <DismissableBanner {...defaultProps} onDismiss={onDismiss} />,
    );

    fireEvent.press(getByTestId(DISMISSABLE_BANNER_DISMISS_TEST_ID));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses the provided test IDs', () => {
    const { getByTestId } = renderWithProvider(
      <DismissableBanner
        {...defaultProps}
        testID="custom-banner"
        dismissTestID="custom-dismiss"
      />,
    );

    expect(getByTestId('custom-banner')).toBeOnTheScreen();
    expect(getByTestId('custom-dismiss')).toBeOnTheScreen();
  });
});
