import {
  findBlockingAlert,
  fundingTapReason,
  isSubmitStep,
  submitTapReason,
} from './guards.ts';
import { parseScreenNodes } from './screen.ts';

const node = (id: string, text = '', y = 500, desc = '') =>
  `<android.view.View resource-id="${id}" text="${text}" content-desc="${desc}" bounds="[0,${y}][1000,${y + 100}]" displayed="true"/>`;
const page = (...nodes: string[]) => `<hierarchy>${nodes.join('')}</hierarchy>`;

describe('guards', () => {
  it('finds blocking alerts unless the step is about them', () => {
    const nodes = parseScreenNodes(
      page(
        node('alert-title', 'Insufficient funds'),
        node(
          'x',
          'You do not have enough ETH in your account to pay for network fees.',
        ),
      ),
    );
    expect(findBlockingAlert(nodes, 'Tap Confirm')).toBe('Insufficient funds');
    expect(
      findBlockingAlert(
        parseScreenNodes(
          page(
            node(
              'x',
              'You do not have enough ETH in your account to pay for network fees.',
            ),
          ),
        ),
        'Tap Confirm',
      ),
    ).toMatch(/do not have enough/);
    expect(
      findBlockingAlert(
        nodes.slice(0, 1),
        'Expect: an insufficient funds warning',
      ),
    ).toBeNull();
    expect(
      findBlockingAlert(
        parseScreenNodes(page(node('a', 'Send'))),
        'Tap Confirm',
      ),
    ).toBeNull();
  });

  it('refuses buy / add funds taps unless the step asks', () => {
    expect(
      fundingTapReason('alert-modal-action-button Buy ETH', 'Tap Confirm'),
    ).toMatch(/buys or adds funds/);
    expect(
      fundingTapReason('confirm-button Confirm', 'Tap Confirm'),
    ).toBeNull();
    expect(
      fundingTapReason('wallet-buy-button Buy', 'Tap Buy on the wallet home'),
    ).toBeNull();
  });

  it('tells submit steps from steps that only open a flow or read a quote', () => {
    expect(isSubmitStep('Tap Confirm')).toBe(true);
    expect(isSubmitStep('Submit the swap')).toBe(true);
    expect(isSubmitStep('Tap Swap to execute the trade')).toBe(true);
    expect(isSubmitStep('Tap the Send button on the wallet home')).toBe(false);
    expect(isSubmitStep('Tap the Swap button on the wallet home')).toBe(false);
    expect(isSubmitStep('Tap Review')).toBe(false);
    expect(isSubmitStep('Enter 0.01 as the source amount')).toBe(false);
    expect(
      isSubmitStep('Select USDC on BNB Chain as the destination token'),
    ).toBe(false);
  });

  it('flags Confirm / Sign taps unless the step is a submit step', () => {
    expect(submitTapReason('confirm-button Confirm', 'Tap Review')).toMatch(
      /only a Confirm\/Submit step/,
    );
    expect(submitTapReason('confirm-button Confirm', 'Tap Confirm')).toBeNull();
    expect(submitTapReason('review-button Review', 'Tap Review')).toBeNull();
    expect(
      submitTapReason(
        'transaction-item-0 Sent ETH Confirmed',
        'Open the Activity tab',
      ),
    ).toBeNull();
  });
});
