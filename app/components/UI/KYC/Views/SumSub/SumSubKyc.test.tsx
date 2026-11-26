import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycSumSub, { KycSumSubSelectorsIDs } from './SumSubKyc';
import Engine from '../../../../../core/Engine';
import I18n from '../../../../../../locales/i18n';
import { toSumSubLocale } from '../../utils/toSumSubLocale';
import type { KycProviderFlowStatus } from '@metamask/kyc-controller';
import { Alert, type AlertButton } from 'react-native';

const alertSpy = () => Alert.alert as jest.Mock;
const lastAlertButtons = () =>
  (alertSpy().mock.calls[alertSpy().mock.calls.length - 1][2] ??
    []) as AlertButton[];
const pressAlertButton = (text: string) =>
  lastAlertButtons()
    .find((button) => button.text === text)
    ?.onPress?.();
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
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
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
        locale: toSumSubLocale(I18n.locale),
      });
    });
    expect(mockKycService.getGeoCountry).toHaveBeenCalled();
    expect(mockKycController.recordSessionDisclaimers).toHaveBeenCalledWith({
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
      expect(alertSpy()).toHaveBeenCalledWith(
        "Couldn't start verification",
        'Something went wrong opening identity verification. Please try again.',
        expect.any(Array),
        { cancelable: false },
      );
    });
    expect(getByTestId(KycSumSubSelectorsIDs.LOADER)).toBeOnTheScreen();
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
      expect(alertSpy()).toHaveBeenCalled();
    });
    expect(lastAlertButtons().map((button) => button.text)).toEqual([
      'Cancel',
      'Try again',
    ]);
    expect(getByTestId(KycSumSubSelectorsIDs.LOADER)).toBeOnTheScreen();
    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('goes back when Cancel is pressed on the launch error dialog', async () => {
    mockKycController.launchProviderFlow.mockRejectedValue(
      new Error('sdk down'),
    );

    renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(alertSpy()).toHaveBeenCalled();
    });
    act(() => {
      pressAlertButton('Cancel');
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
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

  it('re-launches SumSub when Try again is pressed on the launch error dialog', async () => {
    mockKycController.launchProviderFlow.mockRejectedValueOnce(
      new Error('sdk down'),
    );

    renderWithProvider(
      <KycSumSub onSubmitted={mockOnSubmitted} onExit={mockOnExit} />,
    );

    await waitFor(() => {
      expect(alertSpy()).toHaveBeenCalled();
    });

    const callsBeforeRetry =
      mockKycController.launchProviderFlow.mock.calls.length;
    act(() => {
      pressAlertButton('Try again');
    });

    await waitFor(() => {
      expect(
        mockKycController.launchProviderFlow.mock.calls.length,
      ).toBeGreaterThan(callsBeforeRetry);
      expect(mockOnSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    });
  });
});
