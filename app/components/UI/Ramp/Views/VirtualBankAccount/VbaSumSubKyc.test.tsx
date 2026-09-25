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
      launchProviderFlow: jest.fn(),
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
  launchProviderFlow: jest.Mock<Promise<KycProviderFlowStatus>, [unknown]>;
};

describe('VbaSumSubKyc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(mockOnSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    });
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
