import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import V2VerifyIdentity from './VerifyIdentity';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { Linking } from 'react-native';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    userRegion: {
      country: { isoCode: 'US', currency: 'USD' },
      regionCode: 'us-ca',
    },
  }),
}));

jest.mock('../../Deposit/constants/constants', () => ({
  TRANSAK_TERMS_URL_US: 'https://transak.com/terms-us',
  TRANSAK_TERMS_URL_WORLD: 'https://transak.com/terms-world',
  CONSENSYS_PRIVACY_POLICY_URL: 'https://consensys.io/privacy-policy',
  TRANSAK_URL: 'https://transak.com',
}));

jest.mock(
  '../../Deposit/assets/verifyIdentityIllustration.png',
  () => 'mock-image',
);

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2VerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<V2VerifyIdentity />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to enter email when submit button is pressed', async () => {
    const { getByText } = renderWithTheme(<V2VerifyIdentity />);

    fireEvent.press(getByText('deposit.verify_identity.button'));

    expect(mockNavigate).toHaveBeenCalledWith('RampEnterEmail');
  });

  it('opens Transak URL when Transak link is pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithTheme(<V2VerifyIdentity />);

    fireEvent.press(getByText('deposit.verify_identity.description_2_transak'));

    expect(spy).toHaveBeenCalledWith('https://transak.com');
  });

  it('opens privacy policy URL when privacy link is pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithTheme(<V2VerifyIdentity />);

    fireEvent.press(getByTestId('privacy-policy-link-1'));

    expect(spy).toHaveBeenCalledWith('https://consensys.io/privacy-policy');
  });

  it('opens US terms URL for US region', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithTheme(<V2VerifyIdentity />);

    fireEvent.press(
      getByText('deposit.verify_identity.agreement_text_transak_terms'),
    );

    expect(spy).toHaveBeenCalledWith('https://transak.com/terms-us');
  });
});
