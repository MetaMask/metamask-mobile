import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import type { VaultApyHistoryResponse } from '../../../../types/moneyHistoricalVaultApys';
import { useHistoricalVaultApys } from '../../../../hooks/useHistoricalVaultApys';
import AllocationDetails from './AllocationDetails';
import { AllocationDetailsTestIds } from './AllocationDetails.testIds';

jest.mock('../../../../hooks/useHistoricalVaultApys', () => ({
  useHistoricalVaultApys: jest.fn(),
}));

const mockUseHistoricalVaultApys = jest.mocked(useHistoricalVaultApys);

const createResponse = (
  averageApy: string | null,
  status: 'available' | 'unavailable' = 'available',
): VaultApyHistoryResponse =>
  ({
    chain_id: 143,
    vaults: [
      {
        vault_key: 'money',
        vault_address: '0x0000000000000000000000000000000000000000',
        daily_apy: [],
        periods: {
          '30d': {
            status,
            average_apy: averageApy,
          },
        },
      },
    ],
  }) as unknown as VaultApyHistoryResponse;

const setHistoricalApy = (
  averageApy: string | null,
  status: 'available' | 'unavailable' = 'available',
): void => {
  mockUseHistoricalVaultApys.mockReturnValue({
    data: createResponse(averageApy, status),
  } as ReturnType<typeof useHistoricalVaultApys>);
};

describe('AllocationDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistoricalVaultApys.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useHistoricalVaultApys>);
  });

  it('renders a loading placeholder for the 30-day average APY', () => {
    mockUseHistoricalVaultApys.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useHistoricalVaultApys>);

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <AllocationDetails />,
    );

    expect(
      getByTestId(AllocationDetailsTestIds.VALUE('average-apy')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings.allocation_details.average_apy')),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('money.earnings.unavailable')),
    ).not.toBeOnTheScreen();
  });

  it('renders detail rows in the specified order', () => {
    const { getAllByTestId, getByTestId } = renderWithProvider(
      <AllocationDetails />,
    );

    expect(
      getAllByTestId(/money-allocation-details-label-/).map(
        (row) => row.props.testID,
      ),
    ).toEqual([
      AllocationDetailsTestIds.LABEL('vault'),
      AllocationDetailsTestIds.LABEL('base-asset'),
      AllocationDetailsTestIds.LABEL('average-apy'),
      AllocationDetailsTestIds.LABEL('lockup-period'),
      AllocationDetailsTestIds.LABEL('managed-by'),
      AllocationDetailsTestIds.LABEL('monitored-by'),
    ]);

    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('vault')),
    ).toHaveTextContent(strings('money.earnings.allocation_details.vault'));
    expect(
      getByTestId(AllocationDetailsTestIds.VALUE('vault')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.vault_value'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('base-asset')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.base_asset'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.VALUE('base-asset')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.base_asset_value'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('average-apy')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.average_apy'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('lockup-period')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.lockup_period'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('managed-by')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.managed_by'),
    );
    expect(
      getByTestId(AllocationDetailsTestIds.LABEL('monitored-by')),
    ).toHaveTextContent(
      strings('money.earnings.allocation_details.monitored_by'),
    );
  });

  it('renders a positive 30-day average APY with success color', () => {
    setHistoricalApy('0.05234');

    const { getByTestId, UNSAFE_getAllByProps: getAllByProps } =
      renderWithProvider(<AllocationDetails />);
    const apyValue = getByTestId(AllocationDetailsTestIds.VALUE('average-apy'));

    expect(apyValue).toHaveTextContent(
      strings('money.earnings.allocation_details.average_apy_value', {
        value: 5.2,
      }),
    );
    expect(
      getAllByProps({
        testID: AllocationDetailsTestIds.VALUE('average-apy'),
      }).find((node) => node.props.color !== undefined)?.props.color,
    ).toBe(TextColor.SuccessDefault);
  });

  it('renders zero APY as a dash with default color', () => {
    setHistoricalApy('0');

    const { getByTestId, UNSAFE_getAllByProps: getAllByProps } =
      renderWithProvider(<AllocationDetails />);
    const apyValue = getByTestId(AllocationDetailsTestIds.VALUE('average-apy'));

    expect(apyValue).toHaveTextContent(
      strings('money.earnings.allocation_details.average_apy_zero'),
    );
    expect(
      getAllByProps({
        testID: AllocationDetailsTestIds.VALUE('average-apy'),
      }).find((node) => node.props.color !== undefined)?.props.color,
    ).toBe(TextColor.TextDefault);
  });

  it('renders unavailable APY with default color', () => {
    setHistoricalApy(null, 'unavailable');

    const { getByTestId, UNSAFE_getAllByProps: getAllByProps } =
      renderWithProvider(<AllocationDetails />);
    const apyValue = getByTestId(AllocationDetailsTestIds.VALUE('average-apy'));

    expect(apyValue).toHaveTextContent(strings('money.earnings.unavailable'));
    expect(
      getAllByProps({
        testID: AllocationDetailsTestIds.VALUE('average-apy'),
      }).find((node) => node.props.color !== undefined)?.props.color,
    ).toBe(TextColor.TextDefault);
  });
});
