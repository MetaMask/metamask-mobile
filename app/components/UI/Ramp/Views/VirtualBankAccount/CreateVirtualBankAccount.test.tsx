import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CreateVirtualBankAccount from './CreateVirtualBankAccount';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { useVbaArrivalTime } from './hooks/useVbaArrivalTime';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';

const mockOnSuccess = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

jest.mock('./hooks/useVbaArrivalTime');
const mockUseVbaArrivalTime = jest.mocked(useVbaArrivalTime);

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

describe('CreateVirtualBankAccount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 4.2,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
    // Arrival-row behavior is covered by CreateVirtualBankAccount.view.test.tsx
    // (real hooks); the stub keeps the product-pitch tests off the catalog query.
    mockUseVbaArrivalTime.mockReturnValue({
      arrivalTitle: 'Arrives in a few business days',
    });
  });

  it('renders the intro design with feature rows and footer', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Add funds right from your bank')).toBeOnTheScreen();
    expect(getByText('No fees to add funds')).toBeOnTheScreen();
    expect(getByText('Arrives in a few business days')).toBeOnTheScreen();
    expect(getByText('Set up once, use anytime')).toBeOnTheScreen();
    expect(getByText('Starts earning straight away')).toBeOnTheScreen();
    expect(getByText('Powered by')).toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Get account details')).toBeOnTheScreen();
    expect(getByText('Deposits earn 4.2% APY as mUSD.')).toBeOnTheScreen();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.VENDOR_TERMS,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.POPULATED,
    });
  });

  it('shows the earn copy without a number when APY is unavailable', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByText, queryByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Deposits earn APY as mUSD.')).toBeOnTheScreen();
    expect(queryByText('Deposits earn 4.2% APY as mUSD.')).toBeNull();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    fireEvent.press(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('continues into the KYC terms screen', async () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
  });

  it('keeps the CTA disabled while advancing and after it succeeds', async () => {
    let resolveSuccess: (() => void) | undefined;
    mockOnSuccess.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSuccess = resolve;
        }),
    );
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(button);
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSuccess?.();
    });

    // Success leaves the CTA busy so a second tap cannot start another
    // advance while this screen is leaving.
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('keeps the button label from being re-parented while the screen is removed', () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ).findAllByProps({ collapsable: false }),
    ).not.toHaveLength(0);
  });

  it('reenables the CTA when advancing throws', async () => {
    mockOnSuccess.mockRejectedValue(new Error('navigation failed'));
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(button).toBeEnabled();
    });
  });
});
