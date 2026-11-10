import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SentenceWithLinks from './SentenceWithLinks';

// A real sentence key with two placeholders, so the component is exercised
// against the i18n catalog rather than a fixture that could drift from it.
const AGREEMENT_KEY = 'kyc.verify_identity.agreement';

describe('SentenceWithLinks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the whole sentence with the link labels in place', () => {
    const { getByTestId } = renderWithProvider(
      <SentenceWithLinks
        i18nKey={AGREEMENT_KEY}
        testID="sentence"
        links={{
          termsOfUse: { label: 'Terms of Use', url: 'https://mm.test/terms' },
          privacyNotice: {
            label: 'Privacy Notice',
            url: 'https://mm.test/privacy',
          },
        }}
      />,
    );

    expect(getByTestId('sentence')).toHaveTextContent(
      'By continuing, I agree to the MetaMask Terms of Use, acknowledge the MetaMask Privacy Notice and consent to MetaMask storing and transferring my information to idOS.',
    );
  });

  it('opens each link URL independently', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderWithProvider(
      <SentenceWithLinks
        i18nKey={AGREEMENT_KEY}
        links={{
          termsOfUse: {
            label: 'Terms of Use',
            url: 'https://mm.test/terms',
            testID: 'terms-link',
          },
          privacyNotice: {
            label: 'Privacy Notice',
            url: 'https://mm.test/privacy',
            testID: 'privacy-link',
          },
        }}
      />,
    );

    fireEvent.press(getByTestId('privacy-link'));
    fireEvent.press(getByTestId('terms-link'));

    expect(openUrlSpy.mock.calls).toEqual([
      ['https://mm.test/privacy'],
      ['https://mm.test/terms'],
    ]);
  });

  it('renders a link without a URL as plain text, keeping the sentence intact', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SentenceWithLinks
        i18nKey={AGREEMENT_KEY}
        testID="sentence"
        links={{
          termsOfUse: {
            label: 'Terms of Use',
            testID: 'terms-link',
          },
          privacyNotice: {
            label: 'Privacy Notice',
            url: 'https://mm.test/privacy',
          },
        }}
      />,
    );

    expect(queryByTestId('terms-link')).not.toBeOnTheScreen();
    expect(getByTestId('sentence')).toHaveTextContent(
      'By continuing, I agree to the MetaMask Terms of Use, acknowledge the MetaMask Privacy Notice and consent to MetaMask storing and transferring my information to idOS.',
    );
  });

  it('leaves a placeholder with no matching link as literal text', () => {
    const { getByTestId } = renderWithProvider(
      <SentenceWithLinks
        i18nKey={AGREEMENT_KEY}
        testID="sentence"
        links={{
          termsOfUse: { label: 'Terms of Use', url: 'https://mm.test/terms' },
        }}
      />,
    );

    // `privacyNotice` is never substituted, so i18n reports it as missing
    // rather than dropping it — the clauses around it still render, and the
    // supplied link still works.
    expect(getByTestId('sentence')).toHaveTextContent(
      'By continuing, I agree to the MetaMask Terms of Use, acknowledge the MetaMask [missing {{privacyNotice}} value] and consent to MetaMask storing and transferring my information to idOS.',
    );
  });
});
