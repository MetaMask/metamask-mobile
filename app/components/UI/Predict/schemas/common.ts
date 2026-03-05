import { define } from '@metamask/superstruct';
import { Hex } from '@metamask/utils';

export const HexSchema = define<Hex>('HexSchema', (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('0x');
});
