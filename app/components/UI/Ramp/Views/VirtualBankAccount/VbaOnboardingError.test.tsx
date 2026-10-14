import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaOnboardingError, {
  type VbaOnboardingErrorItem,
  VbaOnboardingErrorSelectorsIDs,
} from './VbaOnboardingError';

const mockGoBack = jest.fn();
const mockPrimaryPress = jest.fn();
const mockSecondaryPress = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const checklistItems: VbaOnboardingErrorItem[] = [
  {
    id: 'document',
    icon: IconName.Info,
    title: 'Check your identity document',
    description: 'Make sure it is valid, clear, and fully visible',
  },
  {
    id: 'selfie',
    icon: IconName.UserCircle,
    title: 'Retake your selfie',
    description: 'Use good lighting and show your face clearly',
  },
  {
    id: 'expired',
    icon: IconName.Clock,
    title: 'Document has expired',
    description: 'Upload a valid, unexpired document',
  },
];

const singleItem: VbaOnboardingErrorItem[] = [
  {
    id: 'address',
    icon: IconName.Info,
    title: 'Proof of address',
    description: 'Upload a recent document showing your name and address',
  },
];

describe('VbaOnboardingError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrimaryPress.mockResolvedValue(undefined);
    mockSecondaryPress.mockResolvedValue(undefined);
  });

  it('renders a checklist with a primary and secondary button', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaOnboardingError
        title="We couldn't verify your identity"
        description="A few details need your attention."
        items={checklistItems}
        primaryAction={{ label: 'Try again', onPress: mockPrimaryPress }}
        secondaryAction={{
          label: 'Need help verifying?',
          onPress: mockSecondaryPress,
        }}
      />,
    );

    expect(
      getByTestId(VbaOnboardingErrorSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaOnboardingErrorSelectorsIDs.ILLUSTRATION),
    ).toBeOnTheScreen();
    expect(getByText("We couldn't verify your identity")).toBeOnTheScreen();
    expect(getByText('A few details need your attention.')).toBeOnTheScreen();
    expect(getByTestId(VbaOnboardingErrorSelectorsIDs.LIST)).toBeOnTheScreen();
    checklistItems.forEach((item) => {
      expect(
        getByTestId(`${VbaOnboardingErrorSelectorsIDs.ITEM}-${item.id}`),
      ).toBeOnTheScreen();
      expect(getByText(item.title)).toBeOnTheScreen();
      expect(getByText(item.description)).toBeOnTheScreen();
    });
    expect(getByText('Try again')).toBeOnTheScreen();
    expect(getByText('Need help verifying?')).toBeOnTheScreen();
  });

  it('renders one list item and only the primary button', () => {
    const { getByText, queryByTestId } = renderWithProvider(
      <VbaOnboardingError
        title="We need a little more info"
        description="Review what's needed below to continue."
        items={singleItem}
        primaryAction={{ label: 'Continue', onPress: mockPrimaryPress }}
      />,
    );

    expect(getByText('We need a little more info')).toBeOnTheScreen();
    expect(getByText('Proof of address')).toBeOnTheScreen();
    expect(getByText('Continue')).toBeOnTheScreen();
    expect(
      queryByTestId(VbaOnboardingErrorSelectorsIDs.SECONDARY_BUTTON),
    ).toBeNull();
  });

  it('hides the list when no items are provided', () => {
    const { queryByTestId } = renderWithProvider(
      <VbaOnboardingError
        title="Couldn't continue"
        description="Something went wrong."
        primaryAction={{ label: 'Try again', onPress: mockPrimaryPress }}
      />,
    );

    expect(queryByTestId(VbaOnboardingErrorSelectorsIDs.LIST)).toBeNull();
  });

  it('calls the primary action when its button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingError
        title="Couldn't continue"
        description="Something went wrong."
        primaryAction={{ label: 'Try again', onPress: mockPrimaryPress }}
      />,
    );

    fireEvent.press(getByTestId(VbaOnboardingErrorSelectorsIDs.PRIMARY_BUTTON));

    await waitFor(() => {
      expect(mockPrimaryPress).toHaveBeenCalledTimes(1);
    });
  });

  it('calls the secondary action when its button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingError
        title="Couldn't continue"
        description="Something went wrong."
        primaryAction={{ label: 'Try again', onPress: mockPrimaryPress }}
        secondaryAction={{
          label: 'Need help verifying?',
          onPress: mockSecondaryPress,
        }}
      />,
    );

    fireEvent.press(
      getByTestId(VbaOnboardingErrorSelectorsIDs.SECONDARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockSecondaryPress).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <VbaOnboardingError
        title="Couldn't continue"
        description="Something went wrong."
        primaryAction={{ label: 'Try again', onPress: mockPrimaryPress }}
      />,
    );

    fireEvent.press(getByTestId(VbaOnboardingErrorSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
