import { mockedFieldLabel } from './mockedFieldLabel';

describe('mockedFieldLabel', () => {
  it('hides a field the client invented unless the surface opted in', () => {
    expect(
      mockedFieldLabel('$1', 'markPrice', ['markPrice'], false),
    ).toBeUndefined();
    expect(mockedFieldLabel('$1', 'markPrice', ['markPrice'], true)).toBe('$1');
  });

  it('keeps a real value on every surface', () => {
    expect(mockedFieldLabel('$1', 'markPrice', [], false)).toBe('$1');
    expect(mockedFieldLabel('$1', 'markPrice', undefined, false)).toBe('$1');
  });

  it('stays empty when there was no label to begin with', () => {
    expect(
      mockedFieldLabel(undefined, 'autoClose', undefined, true),
    ).toBeUndefined();
  });
});
