/**
 * Component view tests for PerpsHeroCardView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsHeroCardView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsHeroCardViewSelectorsIDs,
  getPerpsHeroCardViewSelector,
} from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

const longPosition = defaultPositionForViews;

const shortPosition = {
  ...defaultPositionForViews,
  symbol: 'BTC',
  size: '-0.05',
  unrealizedPnl: '-250',
  returnOnEquity: '-0.10',
  entryPrice: '60000',
};

describe('PerpsHeroCardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the hero card container and carousel', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsHeroCardViewSelectorsIDs.CAROUSEL),
    ).toBeOnTheScreen();
  });

  it('shows the header title', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByText(strings('perps.pnl_hero_card.header_title')),
    ).toBeOnTheScreen();
  });

  it('shows the share button', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows the ETH asset symbol on the first card for a long ETH position', async () => {
    renderPerpsHeroCardView({ initialParams: { position: longPosition } });

    expect(
      await screen.findByTestId(getPerpsHeroCardViewSelector.assetSymbol(0)),
    ).toBeOnTheScreen();
  });

  it('shows the direction badge on the first card', async () => {
    renderPerpsHeroCardView({ initialParams: { position: longPosition } });

    expect(
      await screen.findByTestId(getPerpsHeroCardViewSelector.directionBadge(0)),
    ).toBeOnTheScreen();
  });

  it('shows positive PnL display for a profitable long position', async () => {
    renderPerpsHeroCardView({ initialParams: { position: longPosition } });

    const pnlEl = await screen.findByTestId(
      getPerpsHeroCardViewSelector.pnlText(0),
    );
    expect(pnlEl).toBeOnTheScreen();
    // ROE is 20% → displayed as +20.00%
    expect(pnlEl).toHaveTextContent('+20.00%');
  });

  it('shows negative PnL display for a losing short position', async () => {
    renderPerpsHeroCardView({ initialParams: { position: shortPosition } });

    const pnlEl = await screen.findByTestId(
      getPerpsHeroCardViewSelector.pnlText(0),
    );
    expect(pnlEl).toBeOnTheScreen();
    // ROE is -10% → displayed as -10.00%
    expect(pnlEl).toHaveTextContent('-10.00%');
  });

  it('shows the dot indicator for switching between card templates', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByTestId(PerpsHeroCardViewSelectorsIDs.DOT_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('shows the share button label', async () => {
    renderPerpsHeroCardView();

    expect(
      await screen.findByText(strings('perps.pnl_hero_card.share_button')),
    ).toBeOnTheScreen();
  });

  it('pressing the share button does not throw', async () => {
    renderPerpsHeroCardView({ initialParams: { position: longPosition } });

    const shareButton = await screen.findByTestId(
      PerpsHeroCardViewSelectorsIDs.SHARE_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );

    // Share.open is guarded by a native captureRef call which is unavailable in
    // the test environment.  Verify the press does not crash the component.
    expect(() => fireEvent.press(shareButton)).not.toThrow();
  });
});
