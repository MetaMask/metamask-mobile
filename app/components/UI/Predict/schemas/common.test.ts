import { create, StructError } from '@metamask/superstruct';
import { Hex } from './common';

describe('Hex schema', () => {
  it('validates a string starting with 0x', () => {
    const input = '0xabc123';

    const result = create(input, Hex);

    expect(result).toBe('0xabc123');
  });

  it('validates a minimal 0x string', () => {
    const input = '0x';

    const result = create(input, Hex);

    expect(result).toBe('0x');
  });

  it('validates a full-length Ethereum address', () => {
    const input = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';

    const result = create(input, Hex);

    expect(result).toBe('0xe6a2026d58eaff3c7ad7ba9386fb143388002382');
  });

  it('throws for a string without 0x prefix', () => {
    const input = 'abc123';

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for an empty string', () => {
    const input = '';

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for a number value', () => {
    const input = 123;

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for null', () => {
    const input = null;

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for undefined', () => {
    const input = undefined;

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for a boolean value', () => {
    const input = true;

    expect(() => create(input, Hex)).toThrow(StructError);
  });

  it('throws for an object', () => {
    const input = { value: '0x123' };

    expect(() => create(input, Hex)).toThrow(StructError);
  });
});
