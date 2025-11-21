import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PredictGTMModal from './PredictGTMModal';
import StorageWrapper from '../../../../../store/storage-wrapper';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockTheme = {
  colors: {
    background: {
      default: '#ffffff',
      alternative: '#f2f4f6',
    },
    text: {
      default: '#24272a',
    },
    shadow: {
      default: '#000000',
    },
    accent02: {
      light: '#EAC2FF',
    },
  },
};

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => mockTheme,
}));

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
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});
jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('false');
  });

  it('renders correctly with all main elements', async () => {
    const { getByText, getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByText('predict.gtm_content.title')).toBeTruthy();
      expect(getByText('predict.gtm_content.title_description')).toBeTruthy();
      expect(getByText('predict.gtm_content.get_started')).toBeTruthy();
      expect(getByText('predict.gtm_content.not_now')).toBeTruthy();
      expect(getByTestId('predict-gtm-modal-container')).toBeTruthy();
    });
  });

  it('handles close button press correctly', async () => {
    const { getByText } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const notNowButton = getByText('predict.gtm_content.not_now');
      fireEvent.press(notNowButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PREDICT_GTM_MODAL_SHOWN,
      'true',
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('handles get started button press correctly', async () => {
    const { getByText } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const getStartedButton = getByText('predict.gtm_content.get_started');
      fireEvent.press(getStartedButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PREDICT_GTM_MODAL_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: expect.any(String),
      },
    });
  });

  it('renders image correctly', async () => {
    const { getByTestId } = renderWithProvider(<PredictGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByTestId('predict-gtm-modal-container')).toBeTruthy();
    });
  });
});
