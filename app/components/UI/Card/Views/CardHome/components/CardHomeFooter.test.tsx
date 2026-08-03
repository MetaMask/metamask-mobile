import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import CardHomeFooter from './CardHomeFooter';
import { CardHomeSelectors } from '../CardHome.testIds';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

const baseProps = {
  isAuthenticated: true,
  isLoading: false,
  hasAlerts: false,
  hasSetupActions: false,
  supportEmail: 'support@example.com',
  onNavigateToCardTos: jest.fn(),
  onLogout: jest.fn(),
};

describe('CardHomeFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders single TOS fallback when legalDocuments are absent', () => {
    const onNavigateToCardTos = jest.fn();

    const { getByTestId, queryByTestId } = render(
      <CardHomeFooter
        {...baseProps}
        onNavigateToCardTos={onNavigateToCardTos}
      />,
    );

    expect(getByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeOnTheScreen();
    fireEvent.press(getByTestId(CardHomeSelectors.CARD_TOS_ITEM));

    expect(onNavigateToCardTos).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-generalTermsOfUse`),
    ).toBeNull();
  });

  it('renders one row per legal document and opens urls', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <CardHomeFooter
        {...baseProps}
        legalDocuments={[
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
        ]}
      />,
    );

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(getByText('Terms of Use')).toBeOnTheScreen();
    expect(getByText('Privacy Policy')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-privacyPolicy`),
    );

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/privacy');
  });

  it('returns null while loading', () => {
    const { queryByTestId } = render(
      <CardHomeFooter {...baseProps} isLoading />,
    );

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(queryByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM)).toBeNull();
  });

  it('hides legal links while Immersve docs are loading without falling back to TOS', () => {
    const { queryByTestId, getByTestId } = render(
      <CardHomeFooter {...baseProps} hideLegalDocuments />,
    );

    expect(queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
    expect(
      getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
  });
});
