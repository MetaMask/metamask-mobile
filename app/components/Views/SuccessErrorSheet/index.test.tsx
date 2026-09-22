import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheetFooter } from '@metamask/design-system-react-native';
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

  it('navigates back when the primary button is pressed with closeOnPrimaryButtonPress', () => {
    const route = {
      params: {
        ...mockRoute.params,
        closeOnPrimaryButtonPress: true,
      },
    };

    const { getByTestId } = renderWithProvider(
      <SuccessErrorSheet route={route} />,
    );

    fireEvent.press(getByTestId(SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockRoute.params.onPrimaryButtonPress).toHaveBeenCalled();
  });

  it('does not navigate back when the secondary button is pressed with closeOnSecondaryButtonPress false', () => {
    const route = {
      params: {
        ...mockRoute.params,
        closeOnSecondaryButtonPress: false,
      },
    };

    const { getByTestId } = renderWithProvider(
      <SuccessErrorSheet route={route} />,
    );

    fireEvent.press(
      getByTestId(SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON),
    );

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockRoute.params.onSecondaryButtonPress).toHaveBeenCalled();
  });

  it('renders only the primary footer button when secondaryButtonLabel is omitted', () => {
    const route = {
      params: {
        ...mockRoute.params,
        secondaryButtonLabel: undefined,
      },
    };

    const { getByTestId, queryByTestId } = renderWithProvider(
      <SuccessErrorSheet route={route} />,
    );

    expect(
      getByTestId(SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON),
    ).toBeNull();
  });

  it('renders only the secondary footer button when primaryButtonLabel is omitted', () => {
    const route = {
      params: {
        ...mockRoute.params,
        primaryButtonLabel: undefined,
      },
    };

    const { getByTestId, queryByTestId } = renderWithProvider(
      <SuccessErrorSheet route={route} />,
    );

    expect(
      getByTestId(SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON),
    ).toBeNull();
  });

  it('renders footer buttons in reverse order when reverseButtonOrder is true', () => {
    const route = {
      params: {
        ...mockRoute.params,
        reverseButtonOrder: true,
      },
    };

    const { getByTestId, UNSAFE_getByType } = renderWithProvider(
      <SuccessErrorSheet route={route} />,
    );

    expect(UNSAFE_getByType(BottomSheetFooter).props.twClassName).toBe(
      'flex-row-reverse',
    );
    expect(
      getByTestId(SuccessErrorSheetSelectorsIDs.PRIMARY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SuccessErrorSheetSelectorsIDs.SECONDARY_BUTTON),
    ).toBeOnTheScreen();
  });
});
