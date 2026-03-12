import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { ToastContext } from '../../../../component-library/components/Toast';
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

jest.mock('../../../Views/confirmations/hooks/tokens/useAddToken', () => ({
  useAddToken: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      error: { default: 'red' },
      accent04: { normal: 'black' },
    },
  }),
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
    mockPayWithAnyTokenConfirmation.mockResolvedValue({ response: {} });
  });

  it('triggers payWithAnyTokenConfirmation and navigates to confirmation', async () => {
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

    expect(mockPayWithAnyTokenConfirmation).toHaveBeenCalledWith();
    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      headerShown: false,
      replace: true,
      routeParams: expect.objectContaining({
        market: expect.objectContaining({ id: 'market-1' }),
        outcome: expect.objectContaining({ id: 'outcome-1' }),
        outcomeToken: expect.objectContaining({ id: 'token-1' }),
        isConfirmation: true,
      }),
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('goes back and shows error toast when payWithAnyTokenConfirmation fails', async () => {
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

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
  });
});
