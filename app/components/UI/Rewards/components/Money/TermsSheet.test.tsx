import React from 'react';
import { Icon, IconName } from '@metamask/design-system-react-native';
import { Provider } from 'react-redux';
import { fireEvent, render, within } from '@testing-library/react-native';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import configureStore from '../../../../../util/test/configureStore';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import TermsSheet, { TERMS_SHEET_TEST_IDS } from './TermsSheet';

const PROFILE_ID = 'profile-1';
const KEYRING_ID = 'entropy-source-1';
const TERMS_URL = 'https://link.metamask.io/rewards/terms';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const sessionBackgroundState = (profileId: string) => ({
  AuthenticationController: {
    isSignedIn: true,
    srpSessionData: {
      [KEYRING_ID]: { profile: { profileId } },
    },
  },
  KeyringController: {
    isUnlocked: true,
    keyrings: [
      {
        type: ExtendedKeyringTypes.hd,
        accounts: [],
        metadata: { id: KEYRING_ID, name: '' },
      },
    ],
  },
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      canGoBack: () => true,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

const LOCALIZED_TEXT = {
  termsTitle: 'Terms and Conditions',
  termsDescription:
    'These terms explain how you earn, claim, and share rewards.',
  termsLearnMore: 'Learn more',
  termsUrl: TERMS_URL,
} as unknown as ReferralLocalizedText;

describe('TermsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSheet = (
    localizedText: ReferralLocalizedText = LOCALIZED_TEXT,
  ) => {
    const store = configureStore({
      engine: { backgroundState: sessionBackgroundState(PROFILE_ID) },
      rewardsMoney: {
        referralMe: {
          [PROFILE_ID]: {
            loading: false,
            error: false,
            data: { localized_text: localizedText } as ReferralMeDto,
          },
        },
      },
    });
    return render(
      <Provider store={store}>
        <TermsSheet />
      </Provider>,
    );
  };

  it('renders the terms copy and opens the terms URL in the in-app browser', () => {
    const { getByTestId, getByText } = renderSheet();

    expect(getByTestId(TERMS_SHEET_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Terms and Conditions')).toBeOnTheScreen();
    expect(
      getByText('These terms explain how you earn, claim, and share rewards.'),
    ).toBeOnTheScreen();

    expect(
      within(getByTestId(TERMS_SHEET_TEST_IDS.LEARN_MORE)).UNSAFE_getByType(
        Icon,
      ).props.name,
    ).toBe(IconName.ArrowSquareOut);

    fireEvent.press(getByTestId(TERMS_SHEET_TEST_IDS.LEARN_MORE));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: TERMS_URL,
        timestamp: expect.any(Number),
      },
    });
  });

  it('closes when the title and description are both blank', () => {
    const { queryByTestId } = renderSheet({
      ...LOCALIZED_TEXT,
      termsTitle: '   ',
      termsDescription: '',
    });

    expect(mockGoBack).toHaveBeenCalled();
    expect(queryByTestId(TERMS_SHEET_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('leaves Learn more disabled when the terms URL is empty', () => {
    const { getByTestId } = renderSheet({
      ...LOCALIZED_TEXT,
      termsUrl: '   ',
    });

    fireEvent.press(getByTestId(TERMS_SHEET_TEST_IDS.LEARN_MORE));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
