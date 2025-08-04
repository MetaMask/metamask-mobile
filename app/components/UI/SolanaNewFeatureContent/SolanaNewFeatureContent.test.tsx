import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import SolanaNewFeatureContent from './SolanaNewFeatureContent';
import StorageWrapper from '../../../store/storage-wrapper';
import { Linking } from 'react-native';
import { SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE } from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {component}
    </SafeAreaProvider>,
  );

describe('SolanaNewFeatureContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('false');
  });

  it('renders correctly with all main elements', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <SolanaNewFeatureContent />,
    );

    await waitFor(() => {
      expect(getByText('solana_new_feature_content.title')).toBeTruthy();
      expect(
        getByText('solana_new_feature_content.title_description'),
      ).toBeTruthy();
      expect(getByText('solana_new_feature_content.learn_more')).toBeTruthy();
      expect(
        getByText('solana_new_feature_content.import_your_wallet'),
      ).toBeTruthy();
      expect(getByText('solana_new_feature_content.not_now')).toBeTruthy();
      expect(getByTestId('solana-new-feature-sheet')).toBeTruthy();
    });
  });

  it('handles close button press correctly', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const notNowButton = getByText('solana_new_feature_content.not_now');
      fireEvent.press(notNowButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      SOLANA_FEATURE_MODAL_SHOWN,
      'true',
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('handles import wallet button press correctly', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const importButton = getByText(
        'solana_new_feature_content.import_your_wallet',
      );
      fireEvent.press(importButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      SOLANA_FEATURE_MODAL_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_NEW_LINK_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MULTI_SRP.IMPORT);
  });

  it('opens learn more URL when learn more button is pressed', async () => {
    const mockOpenURL = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(() => Promise.resolve(true));

    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const learnMoreButton = getByText(
        'solana_new_feature_content.learn_more',
      );
      fireEvent.press(learnMoreButton);
    });

    expect(mockOpenURL).toHaveBeenCalledWith(
      SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE,
    );

    mockOpenURL.mockRestore();
  });

  it('renders LottieView animation', async () => {
    const { getByTestId } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(getByTestId('solana-new-feature-sheet')).toBeTruthy();
    });
  });
});
