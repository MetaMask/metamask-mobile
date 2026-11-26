import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import CashbackPanel, {
  type CashbackPanelProps,
  type CashbackPanelStatus,
} from './CashbackPanel';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

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
    ['zero balance', { progress: 0 }, 'Earn mUSD every time you spend'],
    ['below the increment', { progress: 0.46 }, 'Getting there, unlocks at $5'],
    [
      'claimable',
      { status: 'claimable', progress: 1 },
      'Your cashback is ready',
    ],
    ['claiming', { status: 'claiming', progress: 1 }, 'On its way…'],
    ['auto payout', { status: 'autoPayout' }, 'Pays out on its own at $5'],
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

  it('shimmers the full bar only while claimable', async () => {
    const claimable = renderPanel({ status: 'claimable', progress: 1 });
    expect(
      await claimable.findByTestId(CashbackPanelSelectors.PROGRESS_SHIMMER),
    ).toBeOnTheScreen();
    claimable.unmount();

    const claiming = renderPanel({ status: 'claiming', progress: 1 });
    expect(
      claiming.queryByTestId(CashbackPanelSelectors.PROGRESS_SHIMMER),
    ).toBeNull();
  });

  it('holds the shimmer until the focus refill has run', async () => {
    const pending = renderPanel({
      status: 'claimable',
      progress: 1,
      isRefillPending: true,
    });
    expect(
      pending.queryByTestId(CashbackPanelSelectors.PROGRESS_SHIMMER),
    ).toBeNull();

    pending.rerender(
      <CashbackPanel
        {...pending.props}
        isRefillPending={false}
        refillKey={1}
      />,
    );
    expect(
      await pending.findByTestId(CashbackPanelSelectors.PROGRESS_SHIMMER),
    ).toBeOnTheScreen();
  });

  it('reports progress for assistive tech', () => {
    const { getByTestId } = renderPanel({ status: 'accruing', progress: 0.46 });

    expect(getByTestId(CashbackPanelSelectors.PROGRESS).props).toMatchObject({
      accessibilityValue: { min: 0, max: 100, now: 46 },
    });
  });

  it('shows skeletons and no progress bar while loading', () => {
    const { getByTestId, queryByTestId } = renderPanel({ status: 'loading' });

    expect(getByTestId(CashbackPanelSelectors.SKELETON)).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.PROGRESS)).toBeNull();
  });
});
