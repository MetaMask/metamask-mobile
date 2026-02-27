import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { RateRow } from './rate-row';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { selectSingleTokenByAddressAndChainId } from '../../../../../../selectors/tokensController';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../selectors/tokensController');

const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);
const mockUseTransactionPayQuotes = jest.mocked(useTransactionPayQuotes);
const mockUseTransactionPayToken = jest.mocked(useTransactionPayToken);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockSelectSingleTokenByAddressAndChainId = jest.mocked(
  selectSingleTokenByAddressAndChainId,
);

describe('RateRow', () => {
  beforeEach(() => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'tx-1',
    } as never);
    mockUseIsTransactionPayLoading.mockReturnValue(false);
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { symbol: 'USDC' } as never,
      isNative: false,
      setPayToken: jest.fn(),
    });
    mockUseTransactionPayQuotes.mockReturnValue([
      {
        sourceAmount: { usd: '10' },
        targetAmount: { usd: '9' },
        request: {
          targetTokenAddress: '0x1',
          targetChainId: '0x1',
        },
      },
    ] as never);
    mockSelectSingleTokenByAddressAndChainId.mockReturnValue({
      symbol: 'mUSD',
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when transaction metadata is unavailable', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    renderWithProvider(<RateRow />, { state: {} });

    expect(screen.getByTestId('rate-row-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('rate-row-container')).not.toBeOnTheScreen();
  });

  it('renders loading skeleton when quote data is loading', () => {
    mockUseIsTransactionPayLoading.mockReturnValue(true);

    renderWithProvider(<RateRow />, { state: {} });

    expect(screen.getByTestId('rate-row-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('rate-row-container')).not.toBeOnTheScreen();
  });

  it('renders exchange rate text', () => {
    renderWithProvider(<RateRow />, { state: {} });

    expect(screen.getByTestId('rate-row-container')).toBeOnTheScreen();
    expect(screen.queryByTestId('rate-row-skeleton')).not.toBeOnTheScreen();
    expect(screen.getByText('1 USDC = 0.9 mUSD')).toBeOnTheScreen();
  });

  it('output token symbol falls back to mUSD when output token is not found', () => {
    mockSelectSingleTokenByAddressAndChainId.mockReturnValue(undefined);

    renderWithProvider(<RateRow />, { state: {} });

    expect(screen.getByText('1 USDC = 0.9 mUSD')).toBeOnTheScreen();
  });

  it('renders undefined conversion rate text when source amount is zero', () => {
    mockUseTransactionPayQuotes.mockReturnValue([
      {
        sourceAmount: { usd: '0' },
        targetAmount: { usd: '9' },
        request: {
          targetTokenAddress: '0x1',
          targetChainId: '0x1',
        },
      },
    ] as never);

    renderWithProvider(<RateRow />, { state: {} });

    expect(screen.getByText('1 USDC = undefined mUSD')).toBeOnTheScreen();
  });
});
