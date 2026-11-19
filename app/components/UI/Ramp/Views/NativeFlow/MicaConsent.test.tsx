import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import MicaConsent, { createMicaConsentNavDetails } from './MicaConsent';
import { MICA_CONSENT_TEST_IDS } from './MicaConsent.testIds';
import { MICA_CONSENT_PREVIEW_PARAMS } from './micaPreviewFixtures';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(
    () =>
      jest.requireActual('./micaPreviewFixtures').MICA_CONSENT_PREVIEW_PARAMS,
  ),
}));

const render = () =>
  renderScreen(
    MicaConsent,
    { name: Routes.RAMP.MICA_CONSENT },
    { state: { engine: { backgroundState } } },
  );

const agreeButton = () =>
  screen.getByTestId(MICA_CONSENT_TEST_IDS.AGREE_BUTTON);

describe('MicaConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description, and user details', () => {
    render();

    expect(screen.getByText('Continue with Transak GmbH')).toBeOnTheScreen();
    expect(
      screen.getByText(/licensed by the Austrian Financial Market Authority/u),
    ).toBeOnTheScreen();
    expect(screen.getByText('Anna Schmidt')).toBeOnTheScreen();
    expect(
      screen.getByText('Hauptstraße 12, 10115 Berlin, Germany'),
    ).toBeOnTheScreen();
    expect(screen.getByText('14 March 1990')).toBeOnTheScreen();
    expect(screen.getByText('+49 151 2345 6789')).toBeOnTheScreen();
  });

  it('keeps Agree & Continue disabled until both boxes are checked', () => {
    render();
    expect(agreeButton()).toBeDisabled();

    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.DATA_CONSENT_CHECKBOX),
    );
    expect(agreeButton()).toBeDisabled();

    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.TERMS_CONSENT_CHECKBOX),
    );
    expect(agreeButton()).toBeEnabled();
  });

  it('goes back when the user agrees', () => {
    render();
    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.DATA_CONSENT_CHECKBOX),
    );
    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.TERMS_CONSENT_CHECKBOX),
    );

    fireEvent.press(agreeButton());

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('opens the Terms of Use link without checking the box', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render();

    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.TERMS_OF_USE_LINK),
    );

    expect(openURL).toHaveBeenCalledWith(
      MICA_CONSENT_PREVIEW_PARAMS.termsOfUseUrl,
    );
    fireEvent.press(
      screen.getByTestId(MICA_CONSENT_TEST_IDS.DATA_CONSENT_CHECKBOX),
    );
    expect(agreeButton()).toBeDisabled();
  });

  it('builds nested navigation details into the Ramp stack', () => {
    expect(createMicaConsentNavDetails(MICA_CONSENT_PREVIEW_PARAMS)).toEqual([
      Routes.RAMP.TOKEN_SELECTION,
      {
        screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
        params: {
          screen: Routes.RAMP.MICA_CONSENT,
          params: MICA_CONSENT_PREVIEW_PARAMS,
        },
      },
    ]);
  });
});
