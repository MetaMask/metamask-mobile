import {
  isBrazeResetInProgress,
  resetBrazeResetInProgressForTesting,
  setBrazeResetInProgress,
} from './resetInProgress';

describe('resetInProgress', () => {
  afterEach(() => {
    resetBrazeResetInProgressForTesting();
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
