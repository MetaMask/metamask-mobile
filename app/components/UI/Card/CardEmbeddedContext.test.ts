import { getCardHomeHeaderMode } from './CardEmbeddedContext';

describe('getCardHomeHeaderMode', () => {
  it('drops the back arrow when Card is opened from the footer', () => {
    expect(getCardHomeHeaderMode(true)).toBe('none');
  });

  it('keeps the back arrow when Card is pushed on its own', () => {
    expect(getCardHomeHeaderMode(false)).toBe('back');
  });
});
