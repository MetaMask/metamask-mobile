import { endTrace, trace, TraceName } from '../../../../util/trace';
import {
  completePerpsTradeSheetInteractiveTrace,
  failPerpsTradeSheetInteractiveTrace,
  PERPS_TRADE_SHEET_INTERACTIVE_TIMEOUT_MS,
  startPerpsTradeSheetInteractiveTrace,
} from './perpsTradeSheetInteractiveTrace';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

describe('perpsTradeSheetInteractiveTrace', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts the interactive span and ends it as unmounted after the timeout', () => {
    startPerpsTradeSheetInteractiveTrace('perp_asset_screen');

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsTradeSheetInteractive,
        data: { source: 'perp_asset_screen' },
      }),
    );
    expect(endTrace).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PERPS_TRADE_SHEET_INTERACTIVE_TIMEOUT_MS);

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PerpsTradeSheetInteractive,
      data: { success: false, reason: 'sheet_not_mounted' },
    });
  });

  it('does not close a later span from a stale timeout', () => {
    startPerpsTradeSheetInteractiveTrace('first');
    completePerpsTradeSheetInteractiveTrace();
    jest.clearAllMocks();

    jest.advanceTimersByTime(PERPS_TRADE_SHEET_INTERACTIVE_TIMEOUT_MS);

    expect(endTrace).not.toHaveBeenCalled();
  });

  it('ends the interactive span immediately with the given failure reason', () => {
    failPerpsTradeSheetInteractiveTrace('transaction_creation_failed');

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.PerpsTradeSheetInteractive,
      data: { success: false, reason: 'transaction_creation_failed' },
    });
  });
});
