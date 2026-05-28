import React from 'react';
import { Alert, Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useCardOnboardingNavigationHandlers } from './useCardOnboardingNavigationHandlers';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => `mocked_${key}`),
}));

const HookProbe = ({
  headerMode,
  handlerKey,
}: {
  headerMode: Parameters<typeof useCardOnboardingNavigationHandlers>[0];
  handlerKey: 'onBack' | 'onClose';
}) => {
  const handlers = useCardOnboardingNavigationHandlers(headerMode);
  const handler = handlers[handlerKey];

  return (
    <Pressable testID="handler-button" onPress={handler}>
      Trigger
    </Pressable>
  );
};

describe('useCardOnboardingNavigationHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns onBack handler for back header mode', () => {
    const { getByTestId } = render(
      <HookProbe headerMode="back" handlerKey="onBack" />,
    );

    fireEvent.press(getByTestId('handler-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows exit confirmation alert for close-with-confirmation header mode', () => {
    const { getByTestId } = render(
      <HookProbe headerMode="close-with-confirmation" handlerKey="onClose" />,
    );

    fireEvent.press(getByTestId('handler-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'mocked_card.card_onboarding.exit_confirmation.title',
      'mocked_card.card_onboarding.exit_confirmation.message',
      expect.any(Array),
    );
  });

  it('navigates to wallet home when exit is confirmed', () => {
    const { getByTestId } = render(
      <HookProbe headerMode="close-with-confirmation" handlerKey="onClose" />,
    );

    fireEvent.press(getByTestId('handler-button'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const destructiveButton = alertCall[2][1];

    destructiveButton.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates directly to wallet home for close-direct header mode', () => {
    const { getByTestId } = render(
      <HookProbe headerMode="close-direct" handlerKey="onClose" />,
    );

    fireEvent.press(getByTestId('handler-button'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('returns no handlers for none header mode', () => {
    const NoneProbe = () => {
      const handlers = useCardOnboardingNavigationHandlers('none');
      return (
        <Pressable testID="none-handler-button" onPress={handlers.onClose}>
          Trigger
        </Pressable>
      );
    };

    const { getByTestId } = render(<NoneProbe />);

    fireEvent.press(getByTestId('none-handler-button'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
