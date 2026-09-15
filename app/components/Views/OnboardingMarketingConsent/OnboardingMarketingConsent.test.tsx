import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import OnboardingMarketingConsent from './index';
import { OnboardingMarketingConsentSelectorsIDs } from './OnboardingMarketingConsent.testIds';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { kind: 'srp' | 'social'; accountType?: string } = {
  kind: 'srp',
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ name: 'Analytics Preference Selected' })),
    }),
    identify: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(() => false),
  isAndroid: jest.fn(() => false),
  isIos: jest.fn(() => true),
  isIphoneX: jest.fn(() => false),
}));

jest.mock(
  '../../../hooks/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => ({
      shouldShowQuestionnaire: false,
      variantName: 'control',
      isActive: false,
    }),
  }),
);

jest.mock('../../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    updateMarketingOptInStatus: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    GeolocationController: {
      refreshGeolocation: jest.fn(),
    },
    KeyringController: {
      state: { keyrings: [] },
    },
  },
}));

jest.mock('../../../util/metrics/metricsOptInUIUtils', () => ({
  markMetricsOptInUISeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../selectors/qrSyncController', () => ({
  ...jest.requireActual('../../../selectors/qrSyncController'),
  selectQrSyncNeedsProvisioning: jest.fn(),
}));

describe('OnboardingMarketingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(false);
    mockRouteParams = { kind: 'srp' };
  });

  it('navigates back to the previous screen when the back button is pressed', () => {
    const { getByTestId } = renderScreen(
      OnboardingMarketingConsent,
      { name: 'OnboardingMarketingConsent' },
      { state: {} },
    );

    fireEvent.press(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders marketing title, checkbox card, and Continue', () => {
    const { getByTestId } = renderScreen(
      OnboardingMarketingConsent,
      { name: 'OnboardingMarketingConsent' },
      { state: {} },
    );

    expect(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.TITLE),
    ).toHaveTextContent(strings('privacy_policy.checkbox_marketing'));
    expect(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(strings('privacy_policy.checkbox'));
    expect(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CHECKBOX),
    ).toBeOnTheScreen();
    expect(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('places title and description above the illustration', () => {
    const { toJSON } = renderScreen(
      OnboardingMarketingConsent,
      { name: 'OnboardingMarketingConsent' },
      { state: {} },
    );

    const order: string[] = [];
    const walk = (node: unknown) => {
      if (!node) {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== 'object') {
        return;
      }
      const treeNode = node as {
        type?: unknown;
        props?: { testID?: string };
        children?: unknown;
      };
      if (treeNode.props?.testID) {
        order.push(treeNode.props.testID);
      }
      if (treeNode.type === 'Image') {
        order.push('Image');
      }
      walk(treeNode.children);
    };
    walk(toJSON());

    const titleIndex = order.indexOf(
      OnboardingMarketingConsentSelectorsIDs.TITLE,
    );
    const descriptionIndex = order.indexOf(
      OnboardingMarketingConsentSelectorsIDs.DESCRIPTION,
    );
    const illustrationIndex = order.indexOf('Image');
    const checkboxIndex = order.indexOf(
      OnboardingMarketingConsentSelectorsIDs.CHECKBOX,
    );

    expect(titleIndex).toBeGreaterThanOrEqual(0);
    expect(descriptionIndex).toBeGreaterThan(titleIndex);
    expect(illustrationIndex).toBeGreaterThan(descriptionIndex);
    expect(checkboxIndex).toBeGreaterThan(illustrationIndex);
  });

  it('persists marketing consent when the checkbox is on and Continue is pressed', async () => {
    const { getByTestId, store } = renderScreen(
      OnboardingMarketingConsent,
      { name: 'OnboardingMarketingConsent' },
      { state: {} },
    );

    fireEvent.press(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CHECKBOX),
    );
    fireEvent.press(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    });
  });

  it('updates OAuth marketing status for social login users', async () => {
    mockRouteParams = { kind: 'social' };
    const { getByTestId } = renderScreen(
      OnboardingMarketingConsent,
      { name: 'OnboardingMarketingConsent' },
      { state: {} },
    );

    fireEvent.press(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CHECKBOX),
    );
    fireEvent.press(
      getByTestId(OnboardingMarketingConsentSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(OAuthLoginService.updateMarketingOptInStatus).toHaveBeenCalledWith(
        true,
      );
    });
  });
});
