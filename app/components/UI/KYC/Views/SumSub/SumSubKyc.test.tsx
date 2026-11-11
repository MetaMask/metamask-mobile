import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycSumSub, { KycSumSubSelectorsIDs } from './SumSubKyc';
import Engine from '../../../../../core/Engine';
import I18n from '../../../../../../locales/i18n';
import { toSumSubLocale } from '../../utils/toSumSubLocale';
import type { KycProviderFlowStatus } from '@metamask/kyc-controller';
const mockOnSubmitted = jest.fn();
const mockOnExit = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockParentGoBack = jest.fn();
const mockParentCanGoBack = jest.fn(() => false);
const mockNavigate = jest.fn();

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotion: () => false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    navigate: mockNavigate,
    getParent: () => ({
      goBack: mockParentGoBack,
      canGoBack: mockParentCanGoBack,
    }),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: {
      getGeoCountry: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  fetchSessionDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  recordSessionDisclaimers: jest.Mock<Promise<void>, [unknown]>;
  launchProviderFlow: jest.Mock<Promise<KycProviderFlowStatus>, [unknown]>;
};
const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock<Promise<string>, []>;
};

const catalog = {
  idOS: [{ key: 'idos-privacy', version: '1' }],
  kycProvider: [{ key: 'sumsub-terms', version: '2' }],
};

describe('KycSumSub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockParentCanGoBack.mockReturnValue(false);
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycController.fetchSessionDisclaimers.mockResolvedValue(catalog);
    mockKycController.recordSessionDisclaimers.mockResolvedValue(undefined);
    mockKycController.launchProviderFlow.mockResolvedValue('submitted');
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    expect(getByTestId(KycSumSubSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount then reports submission', async () => {
    renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({
        vendor: 'iron',
        locale: toSumSubLocale(I18n.locale),
      });
    });
    expect(mockKycService.getGeoCountry).toHaveBeenCalled();
    expect(mockKycController.recordSessionDisclaimers).toHaveBeenCalledWith({
      vendor: 'iron',
      providerDisclaimersAccepted: [{ key: 'sumsub-terms', version: '2' }],
      idosDisclaimersAccepted: [{ key: 'idos-privacy', version: '1' }],
      credentialReusabilityConsentGiven: false,
    });
    expect(mockOnSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
  });

  it('returns to the caller when SumSub is closed before submission', async () => {
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOnSubmitted).not.toHaveBeenCalled();
    expect(getByTestId(KycSumSubSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount without the more-info interstitial', async () => {
    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({
        vendor: 'iron',
        locale: toSumSubLocale(I18n.locale),
      });
    });
    expect(getByTestId(KycSumSubSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('shows a retryable error when the provider flow fails', async () => {
    mockKycController.launchProviderFlow.mockResolvedValue('failed');

    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(getByTestId(KycSumSubSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('shows a retryable error without completing when the launch throws', async () => {
    mockKycController.launchProviderFlow.mockRejectedValue(
      new Error('sdk down'),
    );

    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(getByTestId(KycSumSubSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(getByTestId(KycSumSubSelectorsIDs.RETRY_BUTTON)).toBeOnTheScreen();
    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('hides back while SumSub is launching and ignores the result after leaving', async () => {
    let resolveLaunch: (status: KycProviderFlowStatus) => void = () =>
      undefined;
    mockKycController.launchProviderFlow.mockReturnValue(
      new Promise((resolve) => {
        resolveLaunch = resolve;
      }),
    );

    const { getByTestId, queryByTestId, unmount } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledTimes(1);
    });
    expect(getByTestId(KycSumSubSelectorsIDs.LOADER)).toBeOnTheScreen();
    expect(
      queryByTestId(KycSumSubSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();

    unmount();
    await act(async () => {
      resolveLaunch('submitted');
    });

    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('calls onExit when an abandoned flow has nothing to pop', async () => {
    mockCanGoBack.mockReturnValue(false);
    mockParentCanGoBack.mockReturnValue(false);
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockOnExit).toHaveBeenCalledTimes(1);
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to the parent navigator when an abandoned flow cannot pop the current stack', async () => {
    mockCanGoBack.mockReturnValue(false);
    mockParentCanGoBack.mockReturnValue(true);
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('re-launches SumSub when the retry button is pressed', async () => {
    mockKycController.launchProviderFlow.mockRejectedValueOnce(
      new Error('sdk down'),
    );

    const { getByTestId } = renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(getByTestId(KycSumSubSelectorsIDs.RETRY_BUTTON)).toBeOnTheScreen();
    });

    const callsBeforeRetry =
      mockKycController.launchProviderFlow.mock.calls.length;
    fireEvent.press(getByTestId(KycSumSubSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(
        mockKycController.launchProviderFlow.mock.calls.length,
      ).toBeGreaterThan(callsBeforeRetry);
      expect(mockOnSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    });
  });
});
