import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsGTMModal from './PerpsGTMModal';
import StorageWrapper from '../../../../../store/storage-wrapper';

import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
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
  },
};

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ theme: mockTheme }),
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

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsGTMModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('false');
  });

  it('renders correctly with all main elements', async () => {
    const { getByText, getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByText('perps.gtm_content.title')).toBeTruthy();
      expect(getByText('perps.gtm_content.title_description')).toBeTruthy();
      expect(getByText('perps.gtm_content.try_now')).toBeTruthy();
      expect(getByText('perps.gtm_content.not_now')).toBeTruthy();
      expect(getByTestId('perps-gtm-modal')).toBeTruthy();
    });
  });

  it('handles close button press correctly', async () => {
    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const notNowButton = getByText('perps.gtm_content.not_now');
      fireEvent.press(notNowButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PERPS_GTM_MODAL_SHOWN,
      'true',
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('handles try now button press correctly', async () => {
    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const tryNowButton = getByText('perps.gtm_content.try_now');
      fireEvent.press(tryNowButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PERPS_GTM_MODAL_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.TUTORIAL,
      params: { isFromGTMModal: true },
    });
  });

  it('renders image correctly', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByTestId('perps-gtm-modal')).toBeTruthy();
    });
  });
});
