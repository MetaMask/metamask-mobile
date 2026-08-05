import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PredictGTMModal from './PredictGTMModal';
import StorageWrapper from '../../../../../store/storage-wrapper';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import {
  PREDICT_GTM_MODAL_DECLINE,
  PREDICT_GTM_MODAL_ENGAGE,
  PREDICT_GTM_WHATS_NEW_MODAL,
} from '../../constants/eventNames';
import { PREDICT_GTM_MODAL_TEST_IDS } from './PredictGTMModal.testIds';

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});
jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics');

jest.mock('../../../../../util/metrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    platform: 'ios',
    deviceModel: 'iPhone 14',
  })),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictGTMModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({});
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    jest.mocked(StorageWrapper.getItem).mockResolvedValue('false');
  });

  it('renders all main elements', async () => {
    const { getByText, getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByText('predict.gtm_content.title')).toBeTruthy();
      expect(getByText('predict.gtm_content.title_description')).toBeTruthy();
      expect(getByText('predict.gtm_content.get_started')).toBeTruthy();
      expect(getByText('predict.gtm_content.not_now')).toBeTruthy();
      expect(getByTestId(PREDICT_GTM_MODAL_TEST_IDS.CONTAINER)).toBeTruthy();
    });
  });

  it('tracks Whats New Link Clicked with decline action when not now is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      fireEvent.press(getByTestId(PREDICT_GTM_MODAL_TEST_IDS.NOT_NOW_BUTTON));
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PREDICT_GTM_MODAL_SHOWN,
      'true',
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      platform: 'ios',
      deviceModel: 'iPhone 14',
      feature: PREDICT_GTM_WHATS_NEW_MODAL,
      action: PREDICT_GTM_MODAL_DECLINE,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('tracks Whats New Link Clicked with engage action when get started is pressed', async () => {
    const { getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      fireEvent.press(
        getByTestId(PREDICT_GTM_MODAL_TEST_IDS.GET_STARTED_BUTTON),
      );
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PREDICT_GTM_MODAL_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      platform: 'ios',
      deviceModel: 'iPhone 14',
      feature: PREDICT_GTM_WHATS_NEW_MODAL,
      action: PREDICT_GTM_MODAL_ENGAGE,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: expect.any(String),
      },
    });
  });

  it('renders image', async () => {
    const { getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByTestId(PREDICT_GTM_MODAL_TEST_IDS.CONTAINER)).toBeTruthy();
    });
  });
});
