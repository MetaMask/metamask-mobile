import { define } from '@metamask/superstruct';

export const HexSchema = define<`0x${string}`>('Hex', (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('0x');
});
