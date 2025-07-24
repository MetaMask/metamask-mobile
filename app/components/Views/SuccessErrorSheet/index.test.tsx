import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SuccessErrorSheet from '.';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => (
      <div data-testid="mock-bottom-sheet">{children}</div>
    )),
  }),
);

describe('SuccessErrorSheet', () => {
  const mockRoute = {
    params: {
      title: 'Test Title',
      description: 'Test Description',
      type: 'success' as const,
      primaryButtonLabel: 'Primary',
      secondaryButtonLabel: 'Secondary',
      onPrimaryButtonPress: jest.fn(),
      onSecondaryButtonPress: jest.fn(),
      onClose: jest.fn(),
      customButton: null,
      descriptionAlign: 'center' as const,
      reverseButtonOrder: true,
      icon: IconName.Confirmation,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <SuccessErrorSheet route={mockRoute} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with all props', () => {
    const { getByText, getByRole } = renderWithProvider(
      <SuccessErrorSheet route={mockRoute} />,
    );

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();

    const primaryButton = getByRole('button', { name: 'Primary' });
    const secondaryButton = getByRole('button', { name: 'Secondary' });

    fireEvent.press(primaryButton);
    expect(mockRoute.params.onPrimaryButtonPress).toHaveBeenCalled();

    fireEvent.press(secondaryButton);
    expect(mockRoute.params.onSecondaryButtonPress).toHaveBeenCalled();
  });

  it('renders correctly with error type', () => {
    const mockErrorRoute = {
      params: {
        title: <Text>Test Title</Text>,
        description: <Text>Test Description</Text>,
        type: 'error' as const,
        icon: IconName.CircleX,
        iconColor: IconColor.Warning,
        onPrimaryButtonPress: jest.fn(),
        onSecondaryButtonPress: jest.fn(),
        onClose: jest.fn(),
        customButton: <Text>Custom Button</Text>,
        descriptionAlign: 'center' as const,
      },
    };

    const { getByText } = renderWithProvider(
      <SuccessErrorSheet route={mockErrorRoute} />,
    );

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
    expect(getByText('Custom Button')).toBeTruthy();
  });
});
