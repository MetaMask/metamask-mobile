import React from 'react';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RampsBottomSheetModal from './RampsBottomSheetModal';
import { RampsBottomSheetModalParams } from './RampsBottomSheetModal.types';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: jest.fn(),
    }),
  };
});

describe('RampsBottomSheetModal', () => {
  const initialMetrics: Metrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };

  const defaultParams: RampsBottomSheetModalParams = {
    title: 'Test Title',
    description: 'Test Description',
    buttonLabel: 'Test Button',
  };

  const renderModal = (params: RampsBottomSheetModalParams) =>
    renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <RampsBottomSheetModal route={{ params }} />
      </SafeAreaProvider>,
    );

  it('renders correctly with string title and description', () => {
    const { getByText, toJSON } = renderModal(defaultParams);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
    expect(getByText('Test Button')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom button label', () => {
    const { getByText } = renderModal({
      ...defaultParams,
      buttonLabel: 'Custom Button',
    });

    expect(getByText('Custom Button')).toBeTruthy();
  });

  it('renders without close icon when showCloseIcon is false', () => {
    const { queryByTestId } = renderModal({
      ...defaultParams,
      showCloseIcon: false,
    });

    expect(queryByTestId('header')).toBeNull();
  });

  it('calls onButtonPress when button is pressed', () => {
    const mockOnButtonPress = jest.fn();
    const { getByText } = renderModal({
      ...defaultParams,
      onButtonPress: mockOnButtonPress,
    });

    fireEvent.press(getByText('Test Button'));

    expect(mockOnButtonPress).toHaveBeenCalled();
  });

  it('renders with unsupported region content', () => {
    const { getByText } = renderModal({
      title: 'Unavailable in your region',
      description:
        "Buying crypto isn't available in your location due to limitations with local payment providers or regulatory restrictions.",
      buttonLabel: 'Got it',
    });

    expect(getByText('Unavailable in your region')).toBeTruthy();
    expect(
      getByText(
        "Buying crypto isn't available in your location due to limitations with local payment providers or regulatory restrictions.",
      ),
    ).toBeTruthy();
    expect(getByText('Got it')).toBeTruthy();
  });

  it('renders with eligibility check failed content', () => {
    const { getByText } = renderModal({
      title: 'Eligibility check failed',
      description:
        "We couldn't confirm access based on your region. Please try again. If the issue continues, contact support.",
      buttonLabel: 'Got it',
    });

    expect(getByText('Eligibility check failed')).toBeTruthy();
    expect(
      getByText(
        "We couldn't confirm access based on your region. Please try again. If the issue continues, contact support.",
      ),
    ).toBeTruthy();
  });
});
