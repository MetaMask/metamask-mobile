import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import CashbackPanel, {
  type CashbackPanelProps,
  type CashbackPanelStatus,
} from './CashbackPanel';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

const renderPanel = (overrides: Partial<CashbackPanelProps> = {}) => {
  const props: CashbackPanelProps = {
    status: 'accruing',
    availableLabel: '$2.30',
    claimableLabel: '$10.00',
    remainderLabel: '$2.30',
    incrementLabel: '$5',
    progress: 0.46,
    onClaim: jest.fn(),
    onSetup: jest.fn(),
    ...overrides,
  };
  return { ...render(<CashbackPanel {...props} />), props };
};

describe('CashbackPanel', () => {
  it.each<[CashbackPanelStatus, string]>([
    [
      'accruing',
      strings('card.card_home.cashback_panel.getting_there', { target: '$5' }),
    ],
    ['claimable', strings('card.card_home.cashback_panel.ready')],
    ['claiming', strings('card.card_home.cashback_panel.claiming')],
    [
      'setupMoneyAccount',
      strings('card.card_home.cashback_panel.setup_money_account'),
    ],
    ['setupFunding', strings('card.card_home.cashback_panel.setup_funding')],
    [
      'autoPayout',
      strings('card.card_home.cashback_panel.auto_payout', { target: '$5' }),
    ],
    ['unavailable', strings('card.card_home.cashback_panel.unavailable')],
  ])('shows the %s sublabel', (status, expected) => {
    const { getByTestId } = renderPanel({ status });

    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      expected,
    );
  });

  it('shows the same sublabel on every network when claimable (no destination or fee)', () => {
    const { getByTestId } = renderPanel({ status: 'claimable' });

    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      'Your cashback is ready',
    );
  });

  it.each<[string, Partial<CashbackPanelProps>, string]>([
    ['zero balance', { progress: 0 }, 'Spend to start earning'],
    ['below the increment', { progress: 0.46 }, 'Getting there, unlocks at $5'],
    [
      'claimable',
      { status: 'claimable', progress: 1 },
      'Your cashback is ready',
    ],
    ['claiming', { status: 'claiming', progress: 1 }, 'On its way…'],
    ['auto payout', { status: 'autoPayout' }, 'Pays out at $5'],
  ])(
    'uses the %s copy without repeating the amount',
    (_name, overrides, expected) => {
      const { getByTestId } = renderPanel(overrides);
      const sublabel = getByTestId(CashbackPanelSelectors.SUBLABEL);

      expect(sublabel).toHaveTextContent(expected);
      expect(sublabel).not.toHaveTextContent(/\$\d+\.\d{2}/);
    },
  );

  it('claims the whole-increment amount from the pill', () => {
    const { getByTestId, props } = renderPanel({ status: 'claimable' });

    const pill = getByTestId(CashbackPanelSelectors.PILL);
    expect(pill).toHaveTextContent('$10.00');
    fireEvent.press(pill);

    expect(props.onClaim).toHaveBeenCalledTimes(1);
  });

  it('opens setup from the pill when a destination is missing', () => {
    const { getByTestId, props } = renderPanel({
      status: 'setupMoneyAccount',
    });

    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    expect(props.onSetup).toHaveBeenCalledTimes(1);
    expect(props.onClaim).not.toHaveBeenCalled();
  });

  it('shows an informational pill while accruing', () => {
    const { getByTestId, props } = renderPanel({ status: 'accruing' });

    const pill = getByTestId(CashbackPanelSelectors.PILL);
    expect(pill).toHaveTextContent('$2.30');
    fireEvent.press(pill);

    expect(props.onClaim).not.toHaveBeenCalled();
  });

  it('shimmers the claim pill only while claimable', async () => {
    const claimable = renderPanel({ status: 'claimable', progress: 1 });
    expect(
      await claimable.findByTestId(CashbackPanelSelectors.PILL_SHIMMER),
    ).toBeOnTheScreen();
    claimable.unmount();

    const claiming = renderPanel({ status: 'claiming', progress: 1 });
    expect(
      claiming.queryByTestId(CashbackPanelSelectors.PILL_SHIMMER),
    ).toBeNull();
  });

  it('keeps the claim pill still with Reduce Motion on', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { getByTestId, queryByTestId } = renderPanel({
      status: 'claimable',
      progress: 1,
    });

    expect(getByTestId(CashbackPanelSelectors.PILL)).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.PILL_SHIMMER)).toBeNull();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('holds the shimmer until the focus refill has run', async () => {
    const pending = renderPanel({
      status: 'claimable',
      progress: 1,
      isRefillPending: true,
    });
    expect(
      pending.queryByTestId(CashbackPanelSelectors.PILL_SHIMMER),
    ).toBeNull();

    pending.rerender(
      <CashbackPanel
        {...pending.props}
        isRefillPending={false}
        refillKey={1}
      />,
    );
    expect(
      await pending.findByTestId(CashbackPanelSelectors.PILL_SHIMMER),
    ).toBeOnTheScreen();
  });

  it('reports progress for assistive tech', () => {
    const { getByTestId } = renderPanel({ status: 'accruing', progress: 0.46 });

    expect(getByTestId(CashbackPanelSelectors.PROGRESS).props).toMatchObject({
      accessible: true,
      accessibilityLabel: 'Cashback progress, $2.30 of $5',
      accessibilityValue: { min: 0, max: 100, now: 46 },
    });
  });

  it('names a full bar as the whole increment', () => {
    const { getByTestId } = renderPanel({ status: 'claimable', progress: 1 });

    expect(
      getByTestId(CashbackPanelSelectors.PROGRESS).props.accessibilityLabel,
    ).toBe('Cashback progress, $5 of $5');
  });

  it('shows skeletons and no progress bar while loading', () => {
    const { getByTestId, queryByTestId } = renderPanel({ status: 'loading' });

    expect(getByTestId(CashbackPanelSelectors.SKELETON)).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.PROGRESS)).toBeNull();
  });

  it('shows the cashback rate in the title when known', () => {
    const { getByTestId } = renderPanel({ percentageLabel: '3' });

    expect(getByTestId(CashbackPanelSelectors.TITLE)).toHaveTextContent(
      '3% cashback',
    );
  });

  it('falls back to a plain title without a rate', () => {
    const { getByTestId } = renderPanel();

    expect(getByTestId(CashbackPanelSelectors.TITLE)).toHaveTextContent(
      'Cashback',
    );
  });

  it('shows only the spend prompt for a first-time user', () => {
    const { getByTestId } = renderPanel({ progress: 0 });

    const sublabel = getByTestId(CashbackPanelSelectors.SUBLABEL);
    expect(sublabel).toHaveTextContent('Spend to start earning');
    expect(sublabel).not.toHaveTextContent(/lifetime/);
  });

  it('leads with lifetime cashback for a returning user with nothing to claim', () => {
    const { getByTestId } = renderPanel({
      progress: 0,
      availableLabel: '$0.00',
      lifetimeEarnedLabel: '$10.00',
    });

    const sublabel = getByTestId(CashbackPanelSelectors.SUBLABEL);
    expect(sublabel).toHaveTextContent('$10.00 lifetime');
    expect(sublabel.props.accessibilityLabel).toContain(
      'Spend to start earning',
    );
  });

  it('greys the pill with just the amount while auto payout is on', () => {
    const { getByTestId, queryByTestId, props } = renderPanel({
      status: 'autoPayout',
      availableLabel: '$3.40',
      progress: 0.68,
    });

    const pill = getByTestId(CashbackPanelSelectors.PILL);
    expect(pill).toHaveTextContent('$3.40');
    expect(pill).not.toHaveTextContent(/Auto/);
    fireEvent.press(pill);
    expect(props.onClaim).not.toHaveBeenCalled();
    expect(queryByTestId(CashbackPanelSelectors.PILL_SHIMMER)).toBeNull();
  });
});
