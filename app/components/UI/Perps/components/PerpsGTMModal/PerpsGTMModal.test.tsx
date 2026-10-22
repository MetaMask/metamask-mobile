import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsGTMModal from './PerpsGTMModal';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsGTMModalSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_GTM_MODAL_DECLINE,
  PERPS_GTM_MODAL_ENGAGE,
  PERPS_GTM_WHATS_NEW_MODAL,
} from '../../constants/perpsConfig';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../../../util/metrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    platform: 'ios',
    deviceModel: 'iPhone 14',
  })),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockNavigationServiceNavigate = jest.fn();
jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigationServiceNavigate(...args),
    },
  },
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});
jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics');

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsGTMModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({});
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('false');
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  it('renders all main elements', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_GTM_TITLE),
      ).toHaveTextContent(strings('perps.gtm_content.title'));
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_GTM_DESCRIPTION),
      ).toHaveTextContent(strings('perps.gtm_content.title_description'));
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_GTM_IMAGE),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON),
      ).toHaveTextContent(strings('perps.gtm_content.try_now'));
      expect(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON),
      ).toHaveTextContent(strings('perps.gtm_content.not_now'));
    });
  });

  it('tracks Whats New Link Clicked with decline action when not now is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      fireEvent.press(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON),
      );
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PERPS_GTM_MODAL_SHOWN,
      'true',
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      platform: 'ios',
      deviceModel: 'iPhone 14',
      feature: PERPS_GTM_WHATS_NEW_MODAL,
      action: PERPS_GTM_MODAL_DECLINE,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('tracks Whats New Link Clicked with engage action when try now is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      fireEvent.press(
        getByTestId(PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON),
      );
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PERPS_GTM_MODAL_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      platform: 'ios',
      deviceModel: 'iPhone 14',
      feature: PERPS_GTM_WHATS_NEW_MODAL,
      action: PERPS_GTM_MODAL_ENGAGE,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      { screen: Routes.WALLET.HOME },
      { pop: true },
    );
    expect(mockNavigationServiceNavigate).toHaveBeenCalledWith(
      Routes.PERPS.TUTORIAL,
      {
        isFromGTMModal: true,
      },
    );
  });
});
