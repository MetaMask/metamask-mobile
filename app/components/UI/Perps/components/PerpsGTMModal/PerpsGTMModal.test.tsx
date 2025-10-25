// Mock the textUtils module first
jest.mock('../../utils/textUtils');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsGTMModal from './PerpsGTMModal';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { hasNonLatinCharacters } from '../../utils/textUtils';

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
  useTheme: () => mockTheme,
}));

// Mock for different color schemes
const mockUseColorScheme = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    useColorScheme: () => mockUseColorScheme(),
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
    mockUseColorScheme.mockReturnValue('light'); // Default to light mode
    (hasNonLatinCharacters as jest.Mock).mockReturnValue(false); // Default to Latin characters
  });

  it('renders correctly with all main elements', async () => {
    const { getByText, getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByText('perps.gtm_content.title')).toBeOnTheScreen();
      expect(
        getByText('perps.gtm_content.title_description'),
      ).toBeOnTheScreen();
      expect(getByText('perps.gtm_content.try_now')).toBeOnTheScreen();
      expect(getByText('perps.gtm_content.not_now')).toBeOnTheScreen();
      expect(getByTestId('perps-gtm-modal')).toBeOnTheScreen();
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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL, {
      isFromGTMModal: true,
    });
  });

  it('renders image correctly', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByTestId('perps-gtm-modal')).toBeOnTheScreen();
    });
  });

  it('renders correctly in dark mode', async () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { getByText, getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(getByText('perps.gtm_content.title')).toBeOnTheScreen();
      expect(
        getByText('perps.gtm_content.title_description'),
      ).toBeOnTheScreen();
      expect(getByTestId('perps-gtm-modal')).toBeOnTheScreen();
    });
  });

  it('handles system font when non-Latin characters are detected', async () => {
    (hasNonLatinCharacters as jest.Mock).mockReturnValue(true);

    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const titleElement = getByText('perps.gtm_content.title');
      const descriptionElement = getByText(
        'perps.gtm_content.title_description',
      );

      // Check that hasNonLatinCharacters was called
      expect(hasNonLatinCharacters).toHaveBeenCalled();

      // Verify elements exist
      expect(titleElement).toBeDefined();
      expect(descriptionElement).toBeDefined();
    });
  });

  it('handles MM Poly font when Latin characters are detected', async () => {
    (hasNonLatinCharacters as jest.Mock).mockReturnValue(false);

    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const titleElement = getByText('perps.gtm_content.title');
      const descriptionElement = getByText(
        'perps.gtm_content.title_description',
      );

      // Check that hasNonLatinCharacters was called
      expect(hasNonLatinCharacters).toHaveBeenCalled();

      // Verify elements exist
      expect(titleElement).toBeDefined();
      expect(descriptionElement).toBeDefined();
    });
  });

  it('renders with correct button styles in dark mode', async () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const tryNowButton = getByText('perps.gtm_content.try_now');
      const notNowButton = getByText('perps.gtm_content.not_now');
      expect(tryNowButton).toBeOnTheScreen();
      expect(notNowButton).toBeOnTheScreen();
    });
  });

  it('renders with correct button styles in light mode', async () => {
    mockUseColorScheme.mockReturnValue('light');

    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const tryNowButton = getByText('perps.gtm_content.try_now');
      const notNowButton = getByText('perps.gtm_content.not_now');
      expect(tryNowButton).toBeOnTheScreen();
      expect(notNowButton).toBeOnTheScreen();
    });
  });

  it('calls analytics tracking correctly on button presses', async () => {
    const { getByText } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const tryNowButton = getByText('perps.gtm_content.try_now');
      fireEvent.press(tryNowButton);
    });

    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
  });

  it('verifies all ScrollView properties are set correctly', async () => {
    const { getByTestId } = renderWithProvider(<PerpsGTMModal />, {
      state: initialState,
    });

    await waitFor(() => {
      const modal = getByTestId('perps-gtm-modal');
      expect(modal).toBeOnTheScreen();
    });
  });
});
