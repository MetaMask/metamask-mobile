import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import CashbackRing from './CashbackRing';
import type { CashbackPanelProps } from './CashbackPanel';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

const renderRing = (overrides: Partial<CashbackPanelProps> = {}) => {
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
  return { ...render(<CashbackRing {...props} />), props };
};

describe('CashbackRing', () => {
  it('shows the cashback balance in the middle of the ring', () => {
    const { getByTestId } = renderRing({ availableLabel: '$12.30' });

    expect(getByTestId(CashbackPanelSelectors.RING_AMOUNT)).toHaveTextContent(
      '$12.30',
    );
  });

  it('reports progress towards the payout increment', () => {
    const { getByTestId } = renderRing({ progress: 0.46 });

    expect(
      getByTestId(CashbackPanelSelectors.RING).props.accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 46 });
  });

  it('has no separate status line or pill', () => {
    const { queryByTestId } = renderRing({ status: 'claimable', progress: 1 });

    expect(queryByTestId(CashbackPanelSelectors.SUBLABEL)).toBeNull();
    expect(queryByTestId(CashbackPanelSelectors.PILL)).toBeNull();
  });

  it('claims when tapped while a payout is ready', () => {
    const { getByTestId, props } = renderRing({
      status: 'claimable',
      progress: 1,
    });

    const ring = getByTestId(CashbackPanelSelectors.RING_CONTAINER);
    expect(ring.props.accessibilityLabel).toBe(
      strings('card.card_home.cashback_panel.claim_a11y', {
        amount: '$10.00',
      }),
    );
    fireEvent.press(ring);

    expect(props.onClaim).toHaveBeenCalledTimes(1);
    expect(props.onSetup).not.toHaveBeenCalled();
  });

  it.each(['setupMoneyAccount', 'setupFunding'] as const)(
    'opens set up when tapped while %s',
    (status) => {
      const { getByTestId, props } = renderRing({ status });

      fireEvent.press(getByTestId(CashbackPanelSelectors.RING_CONTAINER));

      expect(props.onSetup).toHaveBeenCalledTimes(1);
      expect(props.onClaim).not.toHaveBeenCalled();
    },
  );

  it.each(['accruing', 'claiming', 'autoPayout'] as const)(
    'does nothing when tapped while %s',
    (status) => {
      const { getByTestId, props } = renderRing({ status });

      fireEvent.press(getByTestId(CashbackPanelSelectors.RING_CONTAINER));

      expect(props.onClaim).not.toHaveBeenCalled();
      expect(props.onSetup).not.toHaveBeenCalled();
    },
  );

  it('describes the state for assistive tech when not claimable', () => {
    const { getByTestId } = renderRing({ progress: 0.46 });

    expect(
      getByTestId(CashbackPanelSelectors.RING_CONTAINER).props
        .accessibilityLabel,
    ).toContain(
      strings('card.card_home.cashback_panel.getting_there', { target: '$5' }),
    );
  });

  it('shows a spinner in place of the amount while claiming', () => {
    const { getByTestId, queryByTestId } = renderRing({
      status: 'claiming',
      progress: 1,
    });

    expect(getByTestId(CashbackPanelSelectors.RING_SPINNER)).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.RING_AMOUNT)).toBeNull();
  });

  it('hides the fill when cashback is unavailable', () => {
    const { queryByTestId } = renderRing({ status: 'unavailable' });

    expect(queryByTestId(CashbackPanelSelectors.RING_FILL)).toBeNull();
  });

  it('shows a skeleton while loading', () => {
    const { getByTestId, queryByTestId } = renderRing({ status: 'loading' });

    expect(getByTestId(CashbackPanelSelectors.SKELETON)).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.RING_AMOUNT)).toBeNull();
  });
});
