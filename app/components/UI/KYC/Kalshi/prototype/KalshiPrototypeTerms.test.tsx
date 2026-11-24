// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KalshiPrototypeVendorTerms from './KalshiPrototypeTerms';
import { KalshiPrototypeTermsSelectorsIDs } from './KalshiPrototypeTerms.testIds';
import {
  PROTOTYPE_KALSHI_DOCUMENTS,
  PROTOTYPE_KALSHI_PRIVACY_POLICY_URL,
  PROTOTYPE_SOCURE_LINKS,
} from './prototypeConstants';

const renderPage = async () => {
  const onAccepted = jest.fn().mockResolvedValue(true);
  const onBack = jest.fn();
  const screen = renderWithProvider(
    <KalshiPrototypeVendorTerms onAccepted={onAccepted} onBack={onBack} />,
  );
  await screen.findByTestId(KalshiPrototypeTermsSelectorsIDs.VENDOR_PAGE);
  return { ...screen, onAccepted, onBack };
};

describe('KalshiPrototypeVendorTerms', () => {
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    openUrlSpy.mockRestore();
  });

  it('shows the design copy', async () => {
    const { getByText } = await renderPage();

    expect(getByText('Step 3 of 3')).toBeOnTheScreen();
    expect(getByText('Kalshi terms')).toBeOnTheScreen();
    expect(
      getByText("Review and accept Kalshi's terms to open a Kalshi account."),
    ).toBeOnTheScreen();
    expect(getByText('Terms and privacy')).toBeOnTheScreen();
  });

  it('keeps Agree and continue off until the Socure box is ticked', async () => {
    const { getByTestId, onAccepted } = await renderPage();
    const button = () =>
      getByTestId(KalshiPrototypeTermsSelectorsIDs.AGREE_BUTTON);

    expect(button()).toBeDisabled();

    fireEvent(
      getByTestId(KalshiPrototypeTermsSelectorsIDs.CONSENT_CHECKBOX),
      'change',
      true,
    );

    expect(button()).toBeEnabled();
    fireEvent.press(button());
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
  });

  it('opens each Kalshi document from its row', async () => {
    const { getByTestId } = await renderPage();

    PROTOTYPE_KALSHI_DOCUMENTS.forEach((document) => {
      fireEvent.press(
        getByTestId(
          `${KalshiPrototypeTermsSelectorsIDs.DOCUMENT_LINK}-${document.id}`,
        ),
      );
      expect(openUrlSpy).toHaveBeenLastCalledWith(document.url);
    });
  });

  it('opens the Socure and Kalshi privacy links without ticking the box', async () => {
    const { getByTestId } = await renderPage();

    fireEvent.press(
      getByTestId(KalshiPrototypeTermsSelectorsIDs.CONSENT_TERMS_LINK),
    );
    expect(openUrlSpy).toHaveBeenLastCalledWith(
      PROTOTYPE_SOCURE_LINKS.termsOfUse,
    );
    fireEvent.press(
      getByTestId(KalshiPrototypeTermsSelectorsIDs.CONSENT_PRIVACY_LINK),
    );
    expect(openUrlSpy).toHaveBeenLastCalledWith(
      PROTOTYPE_SOCURE_LINKS.privacyNotice,
    );
    fireEvent.press(
      getByTestId(KalshiPrototypeTermsSelectorsIDs.AGREEMENT_PRIVACY_LINK),
    );
    expect(openUrlSpy).toHaveBeenLastCalledWith(
      PROTOTYPE_KALSHI_PRIVACY_POLICY_URL,
    );
    expect(
      getByTestId(KalshiPrototypeTermsSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
  });

  it('pops the stack from the back arrow', async () => {
    const { getByTestId, onBack } = await renderPage();

    fireEvent.press(getByTestId(KalshiPrototypeTermsSelectorsIDs.BACK_BUTTON));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
