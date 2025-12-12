import React from 'react';
import { merge } from 'lodash';
import {
  UserFeeLevel,
  GasFeeEstimateLevel,
  GasFeeEstimateType,
} from '@metamask/transaction-controller';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { feeMarketEstimates } from '../../../__mocks__/controllers/gas-fee-controller-mock';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { GasSpeed } from './gas-speed';

jest.mock('../../../hooks/gas/useGasFeeEstimates');

const mockUseGasFeeEstimates = useGasFeeEstimates as jest.MockedFunction<
  typeof useGasFeeEstimates
>;

describe('GasSpeed', () => {
  beforeEach(() => {
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: feeMarketEstimates as unknown as GasFeeEstimates,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when transaction metadata has no userFeeLevel', () => {
    const stateWithoutUserFeeLevel = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                id: '56f60ff0-2bef-11f0-80ce-2f66f7fbd577',
                userFeeLevel: undefined,
              },
            ],
          },
        },
      },
    });

    const { queryByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithoutUserFeeLevel,
    });

    expect(queryByText(/🐢|🦊|🦍|🌐|⚙️/)).toBeNull();
  });

  it.each([
    [GasFeeEstimateLevel.Low, 'Low', /🐢.*Low.*~ 30 sec/],
    [GasFeeEstimateLevel.Medium, 'Medium', /🦊.*Market.*~ 20 sec/],
    [GasFeeEstimateLevel.High, 'High', /🦍.*Aggressive.*~ 10 sec/],
  ])(
    'renders correct content for %s gas fee estimate level',
    (userFeeLevel, _levelName, expectedPattern) => {
      const stateWithFeeLevel = merge({}, transferTransactionStateMock, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  userFeeLevel,
                  gasFeeEstimates: {
                    type: GasFeeEstimateType.FeeMarket,
                  },
                },
              ],
            },
          },
        },
      });

      const { getByText } = renderWithProvider(<GasSpeed />, {
        state: stateWithFeeLevel,
      });

      expect(getByText(expectedPattern)).toBeTruthy();
    },
  );

  it('renders correct content for DAPP_SUGGESTED user fee level', () => {
    const stateWithDappSuggested = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                userFeeLevel: UserFeeLevel.DAPP_SUGGESTED,
              },
            ],
          },
        },
      },
    });

    const { getByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithDappSuggested,
    });

    expect(getByText('🌐 Site suggested')).toBeTruthy();
  });

  it('renders correct content for CUSTOM user fee level', () => {
    const stateWithCustom = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                userFeeLevel: UserFeeLevel.CUSTOM,
              },
            ],
          },
        },
      },
    });

    const { getByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithCustom,
    });

    expect(getByText('⚙️ Advanced')).toBeTruthy();
  });

  it('does not show estimated time for gas price estimate when Medium level is selected', () => {
    const stateWithGasPriceEstimate = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                userFeeLevel: GasFeeEstimateLevel.Medium,
                gasFeeEstimates: {
                  type: GasFeeEstimateType.GasPrice,
                },
              },
            ],
          },
        },
      },
    });

    const { getByText, queryByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithGasPriceEstimate,
    });

    expect(getByText('🦊 Market')).toBeTruthy();
    expect(queryByText(/sec/)).toBeNull();
  });

  it('shows estimated time for fee market estimates', () => {
    const stateWithFeeMarketEstimate = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                userFeeLevel: GasFeeEstimateLevel.High,
                gasFeeEstimates: {
                  type: GasFeeEstimateType.FeeMarket,
                },
              },
            ],
          },
        },
      },
    });

    const { getByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithFeeMarketEstimate,
    });

    expect(getByText(/🦍.*Aggressive.*~ 10 sec/)).toBeTruthy();
  });

  it('handles unknown user fee level by defaulting to advanced', () => {
    const stateWithUnknownFeeLevel = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                userFeeLevel: 'unknown_level' as unknown as UserFeeLevel,
              },
            ],
          },
        },
      },
    });

    const { getByText } = renderWithProvider(<GasSpeed />, {
      state: stateWithUnknownFeeLevel,
    });

    expect(getByText('⚙️ Advanced')).toBeTruthy();
  });

  it('calls useGasFeeEstimates with correct networkClientId', () => {
    const testNetworkClientId = 'test-network-client-id';
    const stateWithNetworkClientId = merge({}, transferTransactionStateMock, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                networkClientId: testNetworkClientId,
                userFeeLevel: GasFeeEstimateLevel.Medium,
              },
            ],
          },
        },
      },
    });

    renderWithProvider(<GasSpeed />, {
      state: stateWithNetworkClientId,
    });

    expect(mockUseGasFeeEstimates).toHaveBeenCalledWith(testNetworkClientId);
  });
});
