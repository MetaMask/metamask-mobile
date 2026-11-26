import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import CardHomeMoreSheet from './CardHomeMoreSheet';
import { CardHomeSelectors } from '../CardHome.testIds';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
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

  it('renders a single TOS row when legalDocuments are absent', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(getByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeOnTheScreen();
    expect(
      queryByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-generalTermsOfUse`),
    ).not.toBeOnTheScreen();
  });

  it('closes the sheet before opening the TOS page', () => {
    const onNavigateToCardTos = jest.fn();
    const { getByTestId } = renderSheet({ onNavigateToCardTos });

    fireEvent.press(getByTestId(CardHomeSelectors.CARD_TOS_ITEM));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(onNavigateToCardTos).toHaveBeenCalledTimes(1);
  });

  it('renders one row per legal document', () => {
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

    expect(
      queryByTestId(CardHomeSelectors.CARD_TOS_ITEM),
    ).not.toBeOnTheScreen();
    expect(getByText('Terms of Use')).toBeOnTheScreen();
    expect(getByText('Privacy Policy')).toBeOnTheScreen();
  });

  it('opens a legal document url when its row is pressed', () => {
    const { getByTestId } = renderSheet({
      legalDocuments: [
        {
          id: 'privacyPolicy',
          title: 'Privacy Policy',
          url: 'https://example.com/privacy',
        },
      ],
    });

    fireEvent.press(
      getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-privacyPolicy`),
    );

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/privacy');
  });

  it('hides the TOS fallback while Immersve docs are loading', () => {
    const { queryByTestId } = renderSheet({ hideLegalDocuments: true });

    expect(
      queryByTestId(CardHomeSelectors.CARD_TOS_ITEM),
    ).not.toBeOnTheScreen();
  });

  it('keeps contact support while Immersve docs are loading', () => {
    const { getByTestId } = renderSheet({ hideLegalDocuments: true });

    expect(
      getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
  });

  it('shows the legal docs error instead of the TOS fallback', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      showLegalDocumentsError: true,
      onRetryLegalDocuments: jest.fn(),
    });

    expect(
      queryByTestId(CardHomeSelectors.CARD_TOS_ITEM),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-error`),
    ).toBeOnTheScreen();
  });

  it('retries loading the legal docs when retry is pressed', () => {
    const onRetryLegalDocuments = jest.fn();
    const { getByTestId } = renderSheet({
      showLegalDocumentsError: true,
      onRetryLegalDocuments,
    });

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

  it('never shows log out; that action stays in Experimental settings', () => {
    const { queryByTestId } = renderSheet();

    expect(queryByTestId(CardHomeSelectors.LOGOUT_ITEM)).not.toBeOnTheScreen();
  });
});
