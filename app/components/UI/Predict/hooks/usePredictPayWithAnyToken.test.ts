import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
import Engine from '../../../../core/Engine';
import { PredictBuyPreviewParams } from '../types/navigation';
import { usePredictPayWithAnyToken } from './usePredictPayWithAnyToken';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

const mockGoBack = jest.fn();
const mockPayWithAnyTokenConfirmation = jest.fn();
const mockNavigateToConfirmation = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    payWithAnyTokenConfirmation: mockPayWithAnyTokenConfirmation,
  }),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: () => ({
    navigateToConfirmation: mockNavigateToConfirmation,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      error: { default: '#f00' },
      accent04: { normal: '#100' },
    },
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      setActiveOrder: jest.fn(),
      clearActiveOrder: jest.fn(),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    {
      value: {
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: mockCloseToast,
          },
        },
      },
    },
    children,
  );

describe('usePredictPayWithAnyToken', () => {
  const market = { id: 'market-1' } as PredictBuyPreviewParams['market'];
  const outcome = { id: 'outcome-1' } as PredictBuyPreviewParams['outcome'];
  const outcomeToken = {
    id: 'token-1',
  } as PredictBuyPreviewParams['outcomeToken'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPayWithAnyTokenConfirmation.mockResolvedValue(undefined);
  });

  it('sets active order, triggers payWithAnyTokenConfirmation, and navigates to confirmation', async () => {
    const { result } = renderHook(() => usePredictPayWithAnyToken(), {
      wrapper,
    });

    await act(async () => {
      await result.current.triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
        amountUsd: 25,
        isInputFocused: false,
      });
    });

    expect(
      Engine.context.PredictController.setActiveOrder,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        market: expect.objectContaining({ id: 'market-1' }),
        outcome: expect.objectContaining({ id: 'outcome-1' }),
        outcomeToken: expect.objectContaining({ id: 'token-1' }),
        amountUsd: 25,
        isInputFocused: false,
      }),
    );
    expect(mockPayWithAnyTokenConfirmation).toHaveBeenCalledWith({});
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      headerShown: false,
      replace: true,
    });
    expect(
      Engine.context.PredictController.clearActiveOrder,
    ).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('handles payWithAnyTokenConfirmation failure by clearing active order, going back, and showing error toast', async () => {
    mockPayWithAnyTokenConfirmation.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePredictPayWithAnyToken(), {
      wrapper,
    });

    await act(async () => {
      await result.current.triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
      });
    });

    expect(
      Engine.context.PredictController.clearActiveOrder,
    ).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
  });
});
