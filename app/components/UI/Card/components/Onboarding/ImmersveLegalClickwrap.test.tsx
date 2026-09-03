import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import ImmersveLegalClickwrap from './ImmersveLegalClickwrap';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.card_onboarding.sign_up.clickwrap_prefix':
        'By pressing "Next", you accept Immersve\'s ',
      'card.card_onboarding.sign_up.clickwrap_and': ' and ',
      'card.card_onboarding.sign_up.clickwrap_suffix': '.',
      'card.card_onboarding.sign_up.legal_docs_error':
        'Unable to load legal documents.',
      'card.card_onboarding.retry_button': 'Try again',
    };
    return map[key] ?? key;
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

const DOCS = [
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
];

describe('ImmersveLegalClickwrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    const { getByTestId, queryByTestId } = render(
      <ImmersveLegalClickwrap
        documents={[]}
        isLoading
        error={null}
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId('signup-immersve-legal-loading')).toBeOnTheScreen();
    expect(queryByTestId('signup-immersve-legal-clickwrap')).toBeNull();
  });

  it('renders error state with retry action', () => {
    const onRetry = jest.fn();

    const { getByTestId } = render(
      <ImmersveLegalClickwrap
        documents={[]}
        isLoading={false}
        error={new Error('502')}
        onRetry={onRetry}
      />,
    );

    expect(getByTestId('signup-immersve-legal-error')).toBeOnTheScreen();
    fireEvent.press(getByTestId('signup-immersve-legal-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders clickwrap with linked document titles', () => {
    const { getByTestId, getByText } = render(
      <ImmersveLegalClickwrap
        documents={DOCS}
        isLoading={false}
        error={null}
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId('signup-immersve-legal-clickwrap')).toBeOnTheScreen();
    expect(getByText('Terms of Use')).toBeOnTheScreen();
    expect(getByText('Privacy Policy')).toBeOnTheScreen();
  });

  it('opens document url when a linked title is pressed', () => {
    const { getByTestId } = render(
      <ImmersveLegalClickwrap
        documents={DOCS}
        isLoading={false}
        error={null}
        onRetry={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('signup-immersve-legal-link-privacyPolicy'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/privacy');
  });

  it('renders error state when documents are empty and treatEmptyAsError is set', () => {
    const onRetry = jest.fn();

    const { getByTestId } = render(
      <ImmersveLegalClickwrap
        documents={[]}
        isLoading={false}
        error={null}
        treatEmptyAsError
        onRetry={onRetry}
      />,
    );

    expect(getByTestId('signup-immersve-legal-error')).toBeOnTheScreen();
    fireEvent.press(getByTestId('signup-immersve-legal-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there are no documents and no error', () => {
    const { queryByTestId } = render(
      <ImmersveLegalClickwrap
        documents={[]}
        isLoading={false}
        error={null}
        onRetry={jest.fn()}
      />,
    );

    expect(queryByTestId('signup-immersve-legal-clickwrap')).toBeNull();
    expect(queryByTestId('signup-immersve-legal-loading')).toBeNull();
    expect(queryByTestId('signup-immersve-legal-error')).toBeNull();
  });
});
