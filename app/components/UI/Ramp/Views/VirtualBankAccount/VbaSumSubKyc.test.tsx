import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSumSubKyc, { VbaSumSubKycSelectorsIDs } from './VbaSumSubKyc';
import Engine from '../../../../../core/Engine';
import type { KycProviderFlowStatus } from '@metamask/kyc-controller';
const mockOnSubmitted = jest.fn();

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

  it('shows more information needed when SumSub is closed before submission', async () => {
    mockKycController.launchProviderFlow.mockResolvedValue('abandoned');

    const { getByTestId } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} />,
    );

    await waitFor(() => {
      expect(
        getByTestId(VbaSumSubKycSelectorsIDs.MORE_INFO_NEEDED),
      ).toBeOnTheScreen();
    });
    expect(
      getByTestId(VbaSumSubKycSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
    expect(mockOnSubmitted).not.toHaveBeenCalled();
  });

  it('shows more information needed on resume without launching SumSub', () => {
    const { getByTestId } = renderWithProvider(
      <VbaSumSubKyc onSubmitted={mockOnSubmitted} initialNeedsMoreInfo />,
    );

    expect(
      getByTestId(VbaSumSubKycSelectorsIDs.MORE_INFO_NEEDED),
    ).toBeOnTheScreen();
    expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
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
