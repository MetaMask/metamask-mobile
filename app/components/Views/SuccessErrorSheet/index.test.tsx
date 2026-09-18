import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SuccessErrorSheet from '.';
import { IconName } from '../../../component-library/components/Icons/Icon';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SuccessErrorSheetSelectorsIDs } from './SuccessErrorSheet.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children?: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));

        return <RNView testID={testID}>{children}</RNView>;
      },
    ),
  };
});

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

  it('renders title, description, and footer buttons', () => {
    const { getByText, getByRole } = renderWithProvider(
      <SuccessErrorSheet route={mockRoute} />,
    );

    expect(getByText('Test Title')).toBeOnTheScreen();
    expect(getByText('Test Description')).toBeOnTheScreen();

    const primaryButton = getByRole('button', { name: 'Primary' });
    const secondaryButton = getByRole('button', { name: 'Secondary' });

    fireEvent.press(primaryButton);
    expect(mockRoute.params.onPrimaryButtonPress).toHaveBeenCalled();

    fireEvent.press(secondaryButton);
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
        descriptionAlign: 'center' as const,
      },
    };

    const { getByText } = renderWithProvider(
      <SuccessErrorSheet route={mockErrorRoute} />,
    );

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
});
