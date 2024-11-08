import { TraceName, trace } from '../../util/trace';
import getUIStartupSpan from './UIStartup';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    UIStartup: 'UIStartup',
  },
}));

describe('getUIStartupSpan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call trace with correct parameters when UIStartupSpan is not set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };
    (trace as jest.Mock).mockReturnValue(mockTraceContext);

    const result = getUIStartupSpan(startTime);

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.UIStartup,
      startTime,
    });
    expect(result).toBe(mockTraceContext);
  });

  it('should return the existing UIStartupSpan if already set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };
    (trace as jest.Mock).mockReturnValue(mockTraceContext);

    // First call to set the UIStartupSpan
    getUIStartupSpan(startTime);

    // Second call should return the same UIStartupSpan
    const result = getUIStartupSpan();

    expect(trace).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockTraceContext);
  });

  it('should not call trace again if UIStartupSpan is already set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };
    (trace as jest.Mock).mockReturnValue(mockTraceContext);

    // First call to set the UIStartupSpan
    getUIStartupSpan(startTime);

    // Second call should return the same UIStartupSpan without calling trace again
    getUIStartupSpan();

    expect(trace).toHaveBeenCalledTimes(1);
  });
});
