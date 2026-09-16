import { formatVolume } from './formatVolume';

describe('formatVolume', () => {
  it('formats millions with an M suffix', () => {
    const result = formatVolume('1500000');

    expect(result).toBe('1.5M');
  });

  it('formats thousands with a k suffix', () => {
    const result = formatVolume('2500');

    expect(result).toBe('2.5k');
  });

  it('formats amounts under one thousand as a whole number', () => {
    const result = formatVolume('500');

    expect(result).toBe('500');
  });

  it('floors amounts under one thousand to a whole number', () => {
    const result = formatVolume('0.1');

    expect(result).toBe('0');
  });

  it('omits a missing volume', () => {
    const result = formatVolume();

    expect(result).toBeUndefined();
  });

  it('omits a negative volume', () => {
    const result = formatVolume('-2500');

    expect(result).toBeUndefined();
  });
});
