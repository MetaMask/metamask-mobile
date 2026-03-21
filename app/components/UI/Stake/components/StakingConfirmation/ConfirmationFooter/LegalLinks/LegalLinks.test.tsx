import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import FooterLegalLinks from './LegalLinks';
import { strings } from '../../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import AppConstants from '../../../../../../../core/AppConstants';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('FooterLegalLinks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const { getByText, toJSON } = renderWithProvider(<FooterLegalLinks />);

    expect(getByText(strings('stake.terms_of_service'))).toBeDefined();
    expect(getByText(strings('stake.risk_disclosure'))).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to terms of use web page', () => {
    const { getByText, toJSON } = renderWithProvider(<FooterLegalLinks />);

    fireEvent.press(getByText(strings('stake.terms_of_service')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: { url: AppConstants.URLS.TERMS_AND_CONDITIONS },
      screen: 'SimpleWebview',
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to risk disclosure web page', () => {
    const { getByText, toJSON } = renderWithProvider(<FooterLegalLinks />);

    fireEvent.press(getByText(strings('stake.risk_disclosure')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      params: { url: AppConstants.URLS.STAKING_RISK_DISCLOSURE },
      screen: 'SimpleWebview',
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
