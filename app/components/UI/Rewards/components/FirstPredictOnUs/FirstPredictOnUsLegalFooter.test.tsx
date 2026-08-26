import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import FirstPredictOnUsLegalFooter from './FirstPredictOnUsLegalFooter';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

const TERMS_URL = 'https://example.com/terms';

describe('FirstPredictOnUsLegalFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when region and terms copy are both empty', () => {
    const { queryByTestId } = render(
      <FirstPredictOnUsLegalFooter
        regionText=""
        termsText=""
        termsUrl={TERMS_URL}
      />,
    );

    expect(queryByTestId('first-predict-on-us-splash-legal-footer')).toBeNull();
  });

  it('renders region and terms copy in the legal footer', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsLegalFooter
        regionText="Availability varies by region."
        termsText="Terms apply."
        termsUrl={TERMS_URL}
      />,
    );

    expect(
      getByTestId('first-predict-on-us-splash-legal-footer'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('first-predict-on-us-splash-legal-footer'),
    ).toHaveTextContent('Availability varies by region. Terms apply.');
    expect(
      getByTestId('first-predict-on-us-splash-terms-link'),
    ).toHaveTextContent('Terms apply.');
  });

  it('renders terms copy without region text when region copy is omitted', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsLegalFooter
        termsText="Terms apply."
        termsUrl={TERMS_URL}
      />,
    );

    expect(
      getByTestId('first-predict-on-us-splash-legal-footer'),
    ).toHaveTextContent('Terms apply.');
  });

  it('does not render the terms link when only region copy is provided', () => {
    const { getByTestId, queryByTestId } = render(
      <FirstPredictOnUsLegalFooter
        regionText="Availability varies by region."
        termsText=""
        termsUrl={TERMS_URL}
      />,
    );

    expect(
      getByTestId('first-predict-on-us-splash-legal-footer'),
    ).toHaveTextContent('Availability varies by region.');
    expect(queryByTestId('first-predict-on-us-splash-terms-link')).toBeNull();
  });

  it('opens the terms URL when the terms link is pressed', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsLegalFooter
        regionText="Availability varies by region."
        termsText="Terms apply."
        termsUrl={TERMS_URL}
      />,
    );

    fireEvent.press(getByTestId('first-predict-on-us-splash-terms-link'));

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_URL);
  });

  it('does not open a URL when terms URL is null', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsLegalFooter
        regionText="Availability varies by region."
        termsText="Terms apply."
        termsUrl={null}
      />,
    );

    fireEvent.press(getByTestId('first-predict-on-us-splash-terms-link'));

    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
