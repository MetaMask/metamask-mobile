import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OptOutSection from './OptOutSection';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'rewards.optout.title': 'Opt out of Rewards',
      'rewards.optout.description':
        "This will remove your accounts from the Rewards program and your progress in any campaigns you've joined. Only do this if you are absolutely sure you want to erase your progress.",
      'rewards.optout.erase_button': 'Erase progress',
    };
    return map[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, { testID, ...props }, children),
    Button: ({
      children,
      onPress,
      testID,
      isDisabled,
      isLoading,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isLoading?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress: isDisabled || isLoading ? undefined : onPress,
          testID,
          disabled: isDisabled,
          ...props,
        },
        ReactActual.createElement(RNText, {}, children),
      ),
    TextVariant: { HeadingMd: 'HeadingMd', BodyMd: 'BodyMd' },
    FontWeight: { Bold: 'Bold' },
    ButtonVariant: { Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

describe('OptOutSection', () => {
  const mockOnErasePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the opt-out section with title, description, and erase button', () => {
    const { getByTestId, getByText } = render(
      <OptOutSection onErasePress={mockOnErasePress} />,
    );
    expect(getByTestId('opt-out-section')).toBeTruthy();
    expect(getByText('Opt out of Rewards')).toBeTruthy();
    expect(getByTestId('opt-out-section-description')).toBeTruthy();
    expect(getByTestId('opt-out-erase-button')).toBeTruthy();
    expect(getByText('Erase progress')).toBeTruthy();
  });

  it('calls onErasePress when "Erase progress" is pressed', () => {
    const { getByTestId } = render(
      <OptOutSection onErasePress={mockOnErasePress} />,
    );
    fireEvent.press(getByTestId('opt-out-erase-button'));
    expect(mockOnErasePress).toHaveBeenCalledTimes(1);
  });
});
