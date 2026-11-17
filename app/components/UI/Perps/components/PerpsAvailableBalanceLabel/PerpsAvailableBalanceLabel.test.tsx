import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TextVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import {
  PerpsMarketBalanceActionsSelectorsIDs,
  PerpsProviderLogosSelectorsIDs,
} from '../../Perps.testIds';
import { formatPerpsBalance } from '../../utils/formatUtils';
import { usePerpsProviderLogoIds } from '../../hooks/usePerpsProviderLogoIds';
import PerpsAvailableBalanceLabel from './PerpsAvailableBalanceLabel';

jest.mock('../../hooks/usePerpsProviderLogoIds', () => ({
  usePerpsProviderLogoIds: jest.fn(),
}));

const mockUsePerpsProviderLogoIds = jest.mocked(usePerpsProviderLogoIds);

const SPENDABLE_BALANCE = '40';

function renderLabel(isHidden = false): void {
  render(
    <PerpsAvailableBalanceLabel
      spendableBalance={SPENDABLE_BALANCE}
      isHidden={isHidden}
      variant={TextVariant.BodyMd}
    />,
  );
}

describe('PerpsAvailableBalanceLabel', () => {
  it('renders the amount without logos when no provider is active', () => {
    mockUsePerpsProviderLogoIds.mockReturnValue([]);

    renderLabel();

    expect(
      screen.queryByTestId(PerpsProviderLogosSelectorsIDs.CONTAINER),
    ).toBeNull();
    expect(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT,
      ),
    ).toHaveTextContent(formatPerpsBalance(SPENDABLE_BALANCE));
    expect(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_SUFFIX,
      ),
    ).toHaveTextContent(strings('perps.available'));
  });

  it('shows the provider logo beside the amount', () => {
    mockUsePerpsProviderLogoIds.mockReturnValue(['hyperliquid']);

    renderLabel();

    expect(screen.getByLabelText('HyperLiquid')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toBeOnTheScreen();
  });

  it('keeps the logo visible when privacy mode hides the amount', () => {
    mockUsePerpsProviderLogoIds.mockReturnValue(['hyperliquid']);

    renderLabel(true);

    expect(screen.getByLabelText('HyperLiquid')).toBeOnTheScreen();
    expect(
      screen.queryByText(formatPerpsBalance(SPENDABLE_BALANCE)),
    ).toBeNull();
    expect(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_SUFFIX,
      ),
    ).toBeOnTheScreen();
  });
});
