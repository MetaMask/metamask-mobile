import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import OptOutSection from './OptOutSection';
import { useOptout } from '../../hooks/useOptout';

jest.mock('../../hooks/useOptout', () => ({
  useOptout: jest.fn(),
}));

let mockConfirmCallback: (() => void) | undefined;
let mockCloseCallback: (() => void) | undefined;
let mockSheetIsLoading: boolean | undefined;
let mockSheetErrorMessage: string | undefined;

jest.mock('./OptOutConfirmationSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onConfirm, onClose, isLoading, errorMessage }: { onConfirm: () => void; onClose: () => void; isLoading?: boolean; errorMessage?: string }) => {
      mockConfirmCallback = onConfirm;
      mockCloseCallback = onClose;
      mockSheetIsLoading = isLoading;
      mockSheetErrorMessage = errorMessage;
      return ReactActual.createElement(
        View,
        { testID: 'opt-out-confirmation-sheet' },
        ReactActual.createElement(TouchableOpacity, { testID: 'opt-out-confirmation-confirm', onPress: onConfirm }),
        ReactActual.createElement(TouchableOpacity, { testID: 'opt-out-confirmation-close', onPress: onClose }),
        ReactActual.createElement(TouchableOpacity, { testID: 'opt-out-confirmation-cancel', onPress: onClose }),
        errorMessage
          ? ReactActual.createElement(View, { testID: 'opt-out-error-banner' }, ReactActual.createElement(RNText, {}, errorMessage))
          : null,
      );
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'rewards.optout.title': 'Opt out of Rewards',
      'rewards.optout.description':
        "This will remove your accounts from the Rewards program and your progress in any campaigns you've joined. Only do this if you are absolutely sure you want to erase your progress.",
      'rewards.optout.erase_button': 'Erase progress',
      'rewards.optout.modal.confirmation_title': 'Are you sure?',
      'rewards.optout.modal.confirmation_description':
        "This will erase all your progress, and can't be reversed. If you rejoin the Rewards program later, you'll start back at 0.",
      'rewards.optout.modal.type_to_confirm': "Type 'erase progress' to continue",
      'rewards.optout.modal.confirm_phrase': 'erase progress',
      'rewards.optout.modal.cancel': 'Cancel',
      'rewards.optout.modal.confirm': 'Confirm',
      'rewards.optout.modal.error_message': 'Failed to opt out of Rewards. Please try again.',
    };
    return map[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View, TouchableOpacity } = jest.requireActual('react-native');

  return {
    Box: ({ children, testID, ...props }: { children?: React.ReactNode; testID?: string; [key: string]: unknown }) =>
      ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({ children, testID, ...props }: { children?: React.ReactNode; testID?: string; [key: string]: unknown }) =>
      ReactActual.createElement(RNText, { testID, ...props }, children),
    Button: ({ children, onPress, testID, isDisabled, isLoading, ...props }: { children?: React.ReactNode; onPress?: () => void; testID?: string; isDisabled?: boolean; isLoading?: boolean; [key: string]: unknown }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { onPress: isDisabled || isLoading ? undefined : onPress, testID, disabled: isDisabled, ...props },
        ReactActual.createElement(RNText, {}, children),
      ),
    ButtonIcon: ({ onPress, testID, ...props }: { onPress?: () => void; testID?: string; [key: string]: unknown }) =>
      ReactActual.createElement(TouchableOpacity, { onPress, testID, ...props }),
    BottomSheet: ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) =>
      ReactActual.createElement(View, { testID: 'bottom-sheet' }, children),
    TextVariant: { HeadingMd: 'HeadingMd', BodyMd: 'BodyMd', BodySm: 'BodySm', HeadingSm: 'HeadingSm' },
    FontWeight: { Bold: 'Bold' },
    ButtonVariant: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
    IconName: { Close: 'Close', Warning: 'Warning' },
    IconColor: { IconDefault: 'IconDefault' },
  };
});

jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const ReactActual = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value, onChangeText, testID, placeholder, ...props }: { value?: string; onChangeText?: (text: string) => void; testID?: string; placeholder?: string; [key: string]: unknown }) =>
      ReactActual.createElement(TextInput, { value, onChangeText, testID, placeholder, ...props }),
  };
});

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID, title }: { testID?: string; title?: string }) =>
      ReactActual.createElement(View, { testID }, ReactActual.createElement(RNText, {}, title)),
  };
});

describe('OptOutSection', () => {
  const mockOptout = jest.fn();
  const mockUseOptout = useOptout as jest.MockedFunction<typeof useOptout>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmCallback = undefined;
    mockCloseCallback = undefined;
    mockSheetIsLoading = undefined;
    mockSheetErrorMessage = undefined;
    mockUseOptout.mockReturnValue({
      optout: mockOptout,
      isLoading: false,
    });
  });

  it('renders the opt-out section with title, description, and erase button', () => {
    const { getByTestId, getByText } = render(<OptOutSection />);
    expect(getByTestId('opt-out-section')).toBeTruthy();
    expect(getByText('Opt out of Rewards')).toBeTruthy();
    expect(getByTestId('opt-out-section-description')).toBeTruthy();
    expect(getByTestId('opt-out-erase-button')).toBeTruthy();
    expect(getByText('Erase progress')).toBeTruthy();
  });

  it('does not show the confirmation sheet initially', () => {
    const { queryByTestId } = render(<OptOutSection />);
    expect(queryByTestId('opt-out-confirmation-sheet')).toBeNull();
  });

  it('opens the confirmation sheet when "Erase progress" is pressed', () => {
    const { getByTestId } = render(<OptOutSection />);
    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();
  });

  it('closes the confirmation sheet when the close button is pressed', () => {
    const { getByTestId, queryByTestId } = render(<OptOutSection />);
    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();
    fireEvent.press(getByTestId('opt-out-confirmation-close'));
    expect(queryByTestId('opt-out-confirmation-sheet')).toBeNull();
  });

  it('closes the confirmation sheet when Cancel is pressed', () => {
    const { getByTestId, queryByTestId } = render(<OptOutSection />);
    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();
    fireEvent.press(getByTestId('opt-out-confirmation-cancel'));
    expect(queryByTestId('opt-out-confirmation-sheet')).toBeNull();
  });

  it('calls optout and closes sheet on successful confirmation', async () => {
    mockOptout.mockResolvedValueOnce(true);
    const { getByTestId, queryByTestId } = render(<OptOutSection />);

    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    });

    expect(mockOptout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(queryByTestId('opt-out-confirmation-sheet')).toBeNull();
    });
  });

  it('shows error banner and keeps sheet open on failed confirmation', async () => {
    mockOptout.mockResolvedValueOnce(false);
    const { getByTestId } = render(<OptOutSection />);

    fireEvent.press(getByTestId('opt-out-erase-button'));

    await act(async () => {
      fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    });

    expect(mockOptout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getByTestId('opt-out-error-banner')).toBeTruthy();
    });
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();
  });

  it('passes isLoading to the confirmation sheet', () => {
    mockUseOptout.mockReturnValue({
      optout: mockOptout,
      isLoading: true,
    });
    const { getByTestId } = render(<OptOutSection />);
    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(getByTestId('opt-out-confirmation-sheet')).toBeTruthy();
    expect(mockSheetIsLoading).toBe(true);
  });
});
