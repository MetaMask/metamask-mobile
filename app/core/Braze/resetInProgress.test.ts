import {
  isBrazeResetInProgress,
  setBrazeResetInProgress,
} from './resetInProgress';

describe('resetInProgress', () => {
  afterEach(() => {
    setBrazeResetInProgress(false);
  });

  it('defaults to false', () => {
    expect(isBrazeResetInProgress()).toBe(false);
  });

  it('reflects the set value', () => {
    setBrazeResetInProgress(true);
    expect(isBrazeResetInProgress()).toBe(true);

    setBrazeResetInProgress(false);
    expect(isBrazeResetInProgress()).toBe(false);
  });
});
