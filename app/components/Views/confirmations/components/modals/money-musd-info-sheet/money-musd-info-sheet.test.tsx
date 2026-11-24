import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import { MoneyMusdInfoSheet } from './money-musd-info-sheet';
import { MoneyMusdInfoSheetTestIds } from './money-musd-info-sheet.testIds';

jest.mock('../../../../../UI/Money/hooks/useMoneyVaultApy');

const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

describe('MoneyMusdInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: 0.062,
      apyPercent: 6.2,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
  });

  it('renders nothing when closed', () => {
    const { queryByTestId } = render(
      <MoneyMusdInfoSheet
        open={false}
        onClose={jest.fn()}
        receiveAmountFiat="$100"
      />,
    );

    expect(queryByTestId(MoneyMusdInfoSheetTestIds.CONTAINER)).toBeNull();
  });

  it('renders dynamic receive title, lead, and all four mUSD bullets when open', () => {
    const { getByTestId, getByText } = render(
      <MoneyMusdInfoSheet open onClose={jest.fn()} receiveAmountFiat="$100" />,
    );

    expect(getByTestId(MoneyMusdInfoSheetTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMusdInfoSheetTestIds.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
      "You'll receive $100 of MetaMask USD",
    );
    expect(getByTestId(MoneyMusdInfoSheetTestIds.LEAD)).toHaveTextContent(
      strings('confirm.money_deposit.musd_info_sheet.lead'),
    );
    expect(
      getByText(
        strings('confirm.money_deposit.musd_info_sheet.bullet_worth_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('confirm.money_deposit.musd_info_sheet.bullet_backed_title'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMusdInfoSheetTestIds.BULLET_EARNS),
    ).toHaveTextContent(
      `Earns up to 6.2% APY${strings('confirm.money_deposit.musd_info_sheet.bullet_earns_body')}`,
    );
    expect(
      getByText(
        strings(
          'confirm.money_deposit.musd_info_sheet.bullet_no_lockups_title',
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('omits the Earns up to APY bullet when APY is unavailable', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyDecimal: undefined,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId, queryByTestId } = render(
      <MoneyMusdInfoSheet
        open
        onClose={jest.fn()}
        receiveAmountFiat="$50.25"
      />,
    );

    expect(getByTestId(MoneyMusdInfoSheetTestIds.TITLE)).toHaveTextContent(
      "You'll receive $50.25 of MetaMask USD",
    );
    expect(queryByTestId(MoneyMusdInfoSheetTestIds.BULLET_EARNS)).toBeNull();
  });
});
