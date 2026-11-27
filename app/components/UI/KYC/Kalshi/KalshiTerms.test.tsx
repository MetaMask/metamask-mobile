import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  KALSHI_PRIVACY_POLICY_URL,
  SOCURE_PRIVACY_NOTICE_URL,
  SOCURE_TERMS_OF_USE_URL,
} from '../constants';
import KalshiTerms, { type KalshiTermsDocument } from './KalshiTerms';
import { KalshiTermsSelectorsIDs } from './KalshiTerms.testIds';

const DOCUMENTS: KalshiTermsDocument[] = [
  {
    key: 'kalshiex-member-agreement',
    title: 'KalshiEX LLC Member Agreement',
    url: 'https://kalshi.example/member-agreement',
  },
  {
    key: 'kalshiex-rulebook',
    title: 'KalshiEX LLC Rulebook',
    url: 'https://kalshi.example/rulebook',
  },
  {
    key: 'kalshi-privacy-policy-v1',
    title: 'Kalshi Privacy Policy',
    url: 'https://kalshi.example/privacy',
  },
];

const renderPage = (
  props: Partial<React.ComponentProps<typeof KalshiTerms>> = {},
) => {
  const onAccept = jest.fn();
  const onBack = jest.fn();
  const screen = renderWithProvider(
    <KalshiTerms
      documents={DOCUMENTS}
      onAccept={onAccept}
      onBack={onBack}
      {...props}
    />,
  );
  return { ...screen, onAccept, onBack };
};

const tickSocureConsent = (screen: ReturnType<typeof renderPage>) =>
  fireEvent(
    screen.getByTestId(KalshiTermsSelectorsIDs.SOCURE_CONSENT_CHECKBOX),
    'change',
    true,
  );

describe('KalshiTerms', () => {
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    openUrlSpy.mockRestore();
  });

  it('shows the step indicator, title and description', () => {
    const { getByText } = renderPage();

    expect(getByText('Step 3 of 3')).toBeOnTheScreen();
    expect(getByText('Kalshi terms')).toBeOnTheScreen();
    expect(
      getByText("Review and accept Kalshi's terms to open a Kalshi account."),
    ).toBeOnTheScreen();
    expect(getByText('Terms and privacy')).toBeOnTheScreen();
  });

  it('lists every Kalshi legalDocument next to the Socure notice', () => {
    const { getByText, getByTestId } = renderPage();

    DOCUMENTS.forEach((legalDocument) => {
      expect(getByText(legalDocument.title)).toBeOnTheScreen();
    });
    expect(
      getByTestId(KalshiTermsSelectorsIDs.SOCURE_DESCRIPTION),
    ).toHaveTextContent(/shares them with Socure/u);
  });

  it('opens a Kalshi legalDocument from its row', () => {
    const { getByTestId } = renderPage();

    DOCUMENTS.forEach((legalDocument) => {
      fireEvent.press(
        getByTestId(
          `${KalshiTermsSelectorsIDs.DOCUMENT_LINK}-${legalDocument.key}`,
        ),
      );
      expect(openUrlSpy).toHaveBeenLastCalledWith(legalDocument.url);
    });
  });

  it('keeps the button off until the Socure consent is ticked', async () => {
    const screen = renderPage();
    const button = () =>
      screen.getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON);

    expect(button()).toBeDisabled();
    expect(screen.getByText('Scroll to continue')).toBeOnTheScreen();

    tickSocureConsent(screen);

    expect(button()).toBeEnabled();
    expect(screen.getByLabelText('Agree and continue')).toBeOnTheScreen();
    fireEvent.press(button());
    await waitFor(() => expect(screen.onAccept).toHaveBeenCalledTimes(1));
  });

  it('opens the Socure links without ticking the consent', () => {
    const { getByTestId } = renderPage();

    fireEvent.press(getByTestId(KalshiTermsSelectorsIDs.SOCURE_TERMS_LINK));
    expect(openUrlSpy).toHaveBeenLastCalledWith(SOCURE_TERMS_OF_USE_URL);
    fireEvent.press(getByTestId(KalshiTermsSelectorsIDs.SOCURE_PRIVACY_LINK));
    expect(openUrlSpy).toHaveBeenLastCalledWith(SOCURE_PRIVACY_NOTICE_URL);
    expect(getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON)).toBeDisabled();
  });

  it('links the privacy policy from the catalog in the footer', () => {
    const { getByTestId } = renderPage();

    fireEvent.press(
      getByTestId(KalshiTermsSelectorsIDs.AGREEMENT_PRIVACY_LINK),
    );

    expect(openUrlSpy).toHaveBeenLastCalledWith(
      'https://kalshi.example/privacy',
    );
  });

  it('falls back to the Kalshi privacy policy when the catalog has none', () => {
    const { getByTestId } = renderPage({ documents: DOCUMENTS.slice(0, 2) });

    fireEvent.press(
      getByTestId(KalshiTermsSelectorsIDs.AGREEMENT_PRIVACY_LINK),
    );

    expect(openUrlSpy).toHaveBeenLastCalledWith(KALSHI_PRIVACY_POLICY_URL);
  });

  it('goes back from the header', () => {
    const { getByTestId, onBack } = renderPage();

    fireEvent.press(getByTestId(KalshiTermsSelectorsIDs.BACK_BUTTON));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows why the last acceptance failed', () => {
    const { getByTestId } = renderPage({ error: 'Kalshi is unavailable' });

    expect(getByTestId(KalshiTermsSelectorsIDs.ERROR)).toHaveTextContent(
      'Kalshi is unavailable',
    );
  });

  it('keeps the button off while submitting', () => {
    const screen = renderPage({ isSubmitting: true });
    tickSocureConsent(screen);

    expect(
      screen.getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
  });
});
