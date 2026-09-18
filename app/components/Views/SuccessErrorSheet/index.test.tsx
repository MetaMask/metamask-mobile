import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SuccessErrorSheet from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SuccessErrorSheetSelectorsIDs } from './SuccessErrorSheet.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

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
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, description, and footer buttons', () => {
    const { getByTestId } = renderWithProvider(
      <SuccessErrorSheet route={mockRoute} />,
    );

    expect(getByTestId(SuccessErrorSheetSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(getByTestId(SuccessErrorSheetSelectorsIDs.TITLE)).toHaveTextContent(
      'Test Title',
    );
    expect(
      getByTestId(SuccessErrorSheetSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent('Test Description');

    fireEvent.press(getByTestId(SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON));
    expect(mockRoute.params.onPrimaryButtonPress).toHaveBeenCalled();

    fireEvent.press(
      getByTestId(SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON),
    );
    expect(mockRoute.params.onSecondaryButtonPress).toHaveBeenCalled();
  });

  it('renders custom title, description, and button for error type', () => {
    const mockErrorRoute = {
      params: {
        title: <Text>Test Title</Text>,
        description: <Text>Test Description</Text>,
        type: 'error' as const,
        onPrimaryButtonPress: jest.fn(),
        onSecondaryButtonPress: jest.fn(),
        onClose: jest.fn(),
        customButton: <Text>Custom Button</Text>,
      },
    };

    const { getByText, getByTestId } = renderWithProvider(
      <SuccessErrorSheet route={mockErrorRoute} />,
    );

    expect(getByTestId(SuccessErrorSheetSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(getByText('Test Title')).toBeOnTheScreen();
    expect(getByText('Test Description')).toBeOnTheScreen();
    expect(getByText('Custom Button')).toBeOnTheScreen();
  });

  it('invokes onClose when the header close button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SuccessErrorSheet route={mockRoute} />,
    );

    fireEvent.press(getByTestId(SuccessErrorSheetSelectorsIDs.CLOSE_BUTTON));

    expect(mockRoute.params.onClose).toHaveBeenCalled();
  });

  it('does not render the header close button when the sheet is not interactable', () => {
    const mockBlockingRoute = {
      params: {
        ...mockRoute.params,
        isInteractable: false,
      },
    };

    const { queryByTestId } = renderWithProvider(
      <SuccessErrorSheet route={mockBlockingRoute} />,
    );

    expect(
      queryByTestId(SuccessErrorSheetSelectorsIDs.CLOSE_BUTTON),
    ).toBeNull();
  });
});
