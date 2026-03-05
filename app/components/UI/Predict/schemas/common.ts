import { define } from '@metamask/superstruct';

export const Hex = define<`0x${string}`>('Hex', (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('0x');
});
