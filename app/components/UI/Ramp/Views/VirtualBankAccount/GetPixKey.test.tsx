import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import GetPixKey from './GetPixKey';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import { startIronKycFlow } from './ironKycFlow';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('./hooks/useKycDisclaimers');
jest.mock('./ironKycFlow');

const mockUseKycDisclaimers = jest.mocked(useKycDisclaimers);
const mockStartIronKycFlow = jest.mocked(startIronKycFlow);
const mockRetry = jest.fn();

const loadedDisclaimer = {
  id: 'd-1',
  url: 'https://iron.example/tc',
  display_name: 'Iron T&C',
};

describe('GetPixKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartIronKycFlow.mockResolvedValue(undefined);
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [loadedDisclaimer],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the title, benefits, and agree and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(getByText('Get your Pix Key')).toBeOnTheScreen();
    expect(getByText('Deposit with')).toBeOnTheScreen();
    expect(getByText('pix')).toBeOnTheScreen();
    expect(
      getByText('Send local and international payments'),
    ).toBeOnTheScreen();
    expect(getByText('Powered by MoonPay.')).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(getByTestId(GetPixKeySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('starts the Iron KYC flow and navigates to verify identity when agree and continue is pressed after disclaimers load', async () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(mockStartIronKycFlow).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('RampVbaVerifyIdentity');
    });
  });

  it('alerts and stays put when the Iron KYC flow fails to start', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockStartIronKycFlow.mockRejectedValue(new Error('No disclaimers.'));
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Identity verification',
        'No disclaimers.',
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a skeleton loader instead of any disclaimer links while the fetch is in flight, and disables the CTA', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );
    expect(mockStartIronKycFlow).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders no disclaimer links and disables the CTA when the fetch comes back empty and is not loading', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });

    const { queryByTestId, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      queryByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${GetPixKeySelectorsIDs.DISCLAIMER_LINK}-d-1`),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );
    expect(mockStartIronKycFlow).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders disclaimers from the KYC API and opens their URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(<GetPixKey />);

    expect(getByText('Iron T&C')).toBeOnTheScreen();

    fireEvent.press(getByText('Iron T&C'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/tc');
  });

  it('shows an error with a retry action and keeps the CTA disabled when the fetch fails', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId, getByText } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );
    expect(mockStartIronKycFlow).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
