import {
  MONEY_SHEET_ENTRANCE_STAGGER_MS,
  MoneySheetEntranceStep,
  moneySheetEntranceDelay,
  resolveMoneySheetEntrancePhase,
} from './sheetEntrance';

describe('moneySheetEntranceDelay', () => {
  it('starts the illustration immediately as step 0 of the wave', () => {
    expect(moneySheetEntranceDelay(MoneySheetEntranceStep.Illustration)).toBe(
      0,
    );
  });

  it('staggers each following step by one interval', () => {
    expect(moneySheetEntranceDelay(MoneySheetEntranceStep.Title)).toBe(
      MONEY_SHEET_ENTRANCE_STAGGER_MS,
    );
    expect(moneySheetEntranceDelay(MoneySheetEntranceStep.Description)).toBe(
      MONEY_SHEET_ENTRANCE_STAGGER_MS * 2,
    );
    expect(moneySheetEntranceDelay(MoneySheetEntranceStep.Footer)).toBe(
      MONEY_SHEET_ENTRANCE_STAGGER_MS * 3,
    );
  });

  it('orders the steps top to bottom', () => {
    const delays = [
      MoneySheetEntranceStep.Illustration,
      MoneySheetEntranceStep.Title,
      MoneySheetEntranceStep.Description,
      MoneySheetEntranceStep.Footer,
    ].map(moneySheetEntranceDelay);

    expect(delays).toEqual([...delays].sort((a, b) => a - b));
  });
});

describe('resolveMoneySheetEntrancePhase', () => {
  it('holds while the reduce motion setting is unresolved, even once active', () => {
    expect(
      resolveMoneySheetEntrancePhase({
        reduceMotionState: null,
        isActive: true,
      }),
    ).toBe('hold');
  });

  it('holds while the sheet has not finished opening', () => {
    expect(
      resolveMoneySheetEntrancePhase({
        reduceMotionState: false,
        isActive: false,
      }),
    ).toBe('hold');
  });

  it('plays once the sheet has opened and motion is allowed', () => {
    expect(
      resolveMoneySheetEntrancePhase({
        reduceMotionState: false,
        isActive: true,
      }),
    ).toBe('play');
  });

  it('settles without motion when reduce motion is enabled', () => {
    expect(
      resolveMoneySheetEntrancePhase({
        reduceMotionState: true,
        isActive: true,
      }),
    ).toBe('settle');
  });

  it('settles under reduce motion before the sheet has even opened', () => {
    expect(
      resolveMoneySheetEntrancePhase({
        reduceMotionState: true,
        isActive: false,
      }),
    ).toBe('settle');
  });
});
