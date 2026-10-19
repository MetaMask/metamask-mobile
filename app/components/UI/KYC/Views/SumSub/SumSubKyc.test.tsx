import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSumSubKyc, { VbaSumSubKycSelectorsIDs } from './SumSubKyc';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import type { KycProviderFlowStatus } from '@metamask/kyc-controller';
const mockOnSubmitted = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockParentGoBack = jest.fn();
const mockParentCanGoBack = jest.fn(() => false);
const mockNavigate = jest.fn();

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

describe('VbaSumSubKyc', () => {
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
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount then reports submission', async () => {
    renderWithProvider(<VbaSumSubKyc onSubmitted={mockOnSubmitted} />);

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({});
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
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOnSubmitted).not.toHaveBeenCalled();
    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount without the more-info interstitial', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({});
    });
    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('shows a retryable error when the provider flow fails', async () => {
    mockKycController.launchProviderFlow.mockResolvedValue('failed');

    const { getByTestId } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(getByTestId(VbaSumSubKycSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('shows a retryable error without completing when the launch throws', async () => {
    mockKycController.launchProviderFlow.mockRejectedValue(
      new Error('sdk down'),
    );

    const { getByTestId } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(getByTestId(VbaSumSubKycSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(
      getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON),
    ).toBeOnTheScreen();
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

    const { queryByTestId, unmount } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledTimes(1);
    });
    expect(
      queryByTestId(VbaSumSubKycSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();

    unmount();
    await act(async () => {
      resolveLaunch('submitted');
    });

    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('goes to Money home when an abandoned flow has nothing to pop', async () => {
    mockCanGoBack.mockReturnValue(false);
    mockParentCanGoBack.mockReturnValue(false);
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    renderWithProvider(<VbaSumSubKyc onSubmitted={mockOnSubmitted} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockParentGoBack).not.toHaveBeenCalled();
  });

  it('falls back to the parent navigator when an abandoned flow cannot pop the current stack', async () => {
    mockCanGoBack.mockReturnValue(false);
    mockParentCanGoBack.mockReturnValue(true);
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    renderWithProvider(<VbaSumSubKyc onSubmitted={mockOnSubmitted} />);

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
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(
        getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON),
      ).toBeOnTheScreen();
    });

    const callsBeforeRetry =
      mockKycController.launchProviderFlow.mock.calls.length;
    fireEvent.press(getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(
        mockKycController.launchProviderFlow.mock.calls.length,
      ).toBeGreaterThan(callsBeforeRetry);
      expect(mockOnSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    });
  });
});
