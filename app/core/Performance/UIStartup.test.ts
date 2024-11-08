import { TraceName, trace } from '../../util/trace';
// eslint-disable-next-line import/no-namespace
import * as traceObj from '../../util/trace';

jest.mock('../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    UIStartup: 'UIStartup',
  },
}));

describe('getUIStartupSpan', () => {
  let getUIStartupSpan: (startTime?: number) => traceObj.TraceContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      getUIStartupSpan = require('./UIStartup').default;
    });
  });

  it('should call trace with correct parameters when UIStartupSpan is not set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };
    jest.spyOn(traceObj, 'trace').mockImplementation(() => mockTraceContext);

    const result = getUIStartupSpan(startTime);

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.UIStartup,
      startTime,
    });
  });

  it('should return the existing UIStartupSpan if already set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };

    const spyFetch = jest
      .spyOn(traceObj, 'trace')
      .mockImplementation(() => mockTraceContext);

    // First call to set the UIStartupSpan
    getUIStartupSpan(startTime);

    // Second call should return the same UIStartupSpan
    const result = getUIStartupSpan();

    expect(spyFetch).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockTraceContext);
  });

  it('should not call trace again if UIStartupSpan is already set', () => {
    const startTime = 12345;
    const mockTraceContext = { name: TraceName.UIStartup, startTime };
    jest.spyOn(traceObj, 'trace').mockImplementation(() => mockTraceContext);

    // First call to set the UIStartupSpan
    getUIStartupSpan(startTime);

    // Second call should return the same UIStartupSpan without calling trace again
    getUIStartupSpan();

    expect(trace).toHaveBeenCalledTimes(1);
  });
});
