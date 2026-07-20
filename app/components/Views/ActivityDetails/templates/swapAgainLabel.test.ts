import { strings } from '../../../../../locales/i18n';
import { getSwapAgainLabel } from './swapAgainLabel';

describe('getSwapAgainLabel', () => {
  it.each([
    ['swap', 'activity_details.swap_again'],
    ['convert', 'activity_details.convert_again'],
    ['wrap', 'activity_details.wrap_again'],
    ['unwrap', 'activity_details.unwrap_again'],
    ['lendingDeposit', 'activity_details.swap_again'],
    ['lendingWithdrawal', 'activity_details.swap_again'],
  ] as const)('maps %s to the %s label', (type, key) => {
    expect(getSwapAgainLabel(type)).toBe(strings(key));
  });

  it('never returns the generic "Do it again" copy', () => {
    (
      [
        'swap',
        'convert',
        'wrap',
        'unwrap',
        'lendingDeposit',
        'lendingWithdrawal',
      ] as const
    ).forEach((type) => {
      expect(getSwapAgainLabel(type)).not.toBe('Do it again');
    });
  });
});
