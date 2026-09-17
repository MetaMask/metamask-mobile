import React from 'react';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSumSubKyc, { VbaSumSubKycSelectorsIDs } from './VbaSumSubKyc';
import Engine from '../../../../../core/Engine';
import { hydrateAndNavigateVbaOnboarding } from './hydrateAndNavigateVbaOnboarding';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('./hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      startSumSub: jest.fn(),
      state: { sumsub: { status: 'complete' } },
    },
  },
}));

const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);
const mockStartSumSub = Engine.context.KycController.startSumSub as jest.Mock;

describe('VbaSumSubKyc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateAndNavigate.mockResolvedValue(undefined);
    mockStartSumSub.mockResolvedValue({});
    Engine.context.KycController.state.sumsub.status = 'complete';
  });

  it('renders the placeholder container', () => {
    const { getByTestId } = renderWithProvider(<VbaSumSubKyc />);

    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount then rehydrates onward from the outcome', async () => {
    renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(mockStartSumSub).toHaveBeenCalledTimes(1);
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('returns to the previous screen without rehydrating when the SDK is abandoned', async () => {
    Engine.context.KycController.state.sumsub.status = 'abandoned';

    renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('returns to the previous screen when launching SumSub throws', async () => {
    mockStartSumSub.mockRejectedValue(new Error('sdk down'));

    renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });
});
