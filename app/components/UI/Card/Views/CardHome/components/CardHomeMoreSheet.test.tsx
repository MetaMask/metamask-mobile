import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import CardHomeMoreSheet from './CardHomeMoreSheet';
import { CardHomeSelectors } from '../CardHome.testIds';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        logout: (...args: unknown[]) => mockLogout(...args),
      },
    },
  },
}));

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const baseProps = {
  onClose: jest.fn(),
  supportEmail: 'support@example.com',
  onNavigateToCardTos: jest.fn(),
};

const renderSheet = (
  props: Partial<React.ComponentProps<typeof CardHomeMoreSheet>> = {},
) =>
  renderWithProvider(<CardHomeMoreSheet {...baseProps} {...props} />, {
    state: { engine: { backgroundState } },
  });

describe('CardHomeMoreSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the sheet with the More title', () => {
    const { getByTestId, getByText } = renderSheet();

    expect(getByTestId(CardHomeSelectors.MORE_SHEET)).toBeOnTheScreen();
    expect(getByText('card.card_home.more_sheet.title')).toBeOnTheScreen();
  });

  it('renders single TOS fallback when legalDocuments are absent and closes before navigating', () => {
    const onNavigateToCardTos = jest.fn();
    const { getByTestId, queryByTestId } = renderSheet({
      onNavigateToCardTos,
    });

    fireEvent.press(getByTestId(CardHomeSelectors.CARD_TOS_ITEM));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(onNavigateToCardTos).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-generalTermsOfUse`),
    ).toBeNull();
  });

  it('renders one row per legal document and opens urls', () => {
    const { getByTestId, getByText, queryByTestId } = renderSheet({
      legalDocuments: [
        {
          id: 'generalTermsOfUse',
          title: 'Terms of Use',
          url: 'https://example.com/terms',
        },
        {
          id: 'privacyPolicy',
          title: 'Privacy Policy',
          url: 'https://example.com/privacy',
        },
      ],
    });

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(getByText('Terms of Use')).toBeOnTheScreen();
    expect(getByText('Privacy Policy')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-privacyPolicy`),
    );

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/privacy');
  });

  it('hides legal links while Immersve docs are loading without falling back to TOS', () => {
    const { queryByTestId, getByTestId } = renderSheet({
      hideLegalDocuments: true,
    });

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(
      getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
  });

  it('shows error and retry for Immersve instead of TOS fallback when docs unavailable', () => {
    const onRetryLegalDocuments = jest.fn();
    const { getByTestId, queryByTestId } = renderSheet({
      showLegalDocumentsError: true,
      onRetryLegalDocuments,
    });

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(
      getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-error`),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-retry`));
    expect(onRetryLegalDocuments).toHaveBeenCalledTimes(1);
  });

  it('drafts a support email when no contact support handler is provided', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM));

    expect(Linking.openURL).toHaveBeenCalledWith('mailto:support@example.com');
  });

  it('swallows the mailto rejection on devices with no mail handler', async () => {
    jest
      .mocked(Linking.openURL)
      .mockRejectedValueOnce(
        new Error('Unable to open URL: mailto:support@example.com'),
      );
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@example.com',
      );
    });
  });

  it('calls the contact support handler instead of drafting an email when provided', () => {
    const onContactSupport = jest.fn();
    const { getByTestId } = renderSheet({ onContactSupport });

    fireEvent.press(getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(onContactSupport).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('does not show log out when the user is signed out', () => {
    const { queryByTestId, getByTestId } = renderSheet();

    expect(
      getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
    expect(queryByTestId(CardHomeSelectors.LOGOUT_ITEM)).toBeNull();
  });

  it('shows log out after contact support when the user is signed in', () => {
    const { getByTestId } = renderSheet({ isAuthenticated: true });

    expect(
      getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.LOGOUT_ITEM)).toBeOnTheScreen();
  });

  it('closes the sheet and shows the confirmation alert when log out is pressed', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByTestId } = renderSheet({ isAuthenticated: true });

    fireEvent.press(getByTestId(CardHomeSelectors.LOGOUT_ITEM));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'card.card_home.logout_confirmation_title',
      'card.card_home.logout_confirmation_message',
      expect.any(Array),
    );
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('calls CardController.logout when log out is confirmed', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByTestId } = renderSheet({ isAuthenticated: true });

    fireEvent.press(getByTestId(CardHomeSelectors.LOGOUT_ITEM));

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      style?: string;
      onPress?: () => void;
    }[];
    const confirm = buttons.find((button) => button.style === 'destructive');

    await act(async () => {
      confirm?.onPress?.();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('does not call CardController.logout when log out is cancelled', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByTestId } = renderSheet({ isAuthenticated: true });

    fireEvent.press(getByTestId(CardHomeSelectors.LOGOUT_ITEM));

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      style?: string;
      onPress?: () => void;
    }[];
    const cancel = buttons.find((button) => button.style === 'cancel');
    cancel?.onPress?.();

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
