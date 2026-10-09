import EngineService from '../../../../core/EngineService';
import Logger from '../../../../util/Logger';
import { flushEngineState } from './flushEngineState';

jest.mock('../../../../core/EngineService');
jest.mock('../../../../util/Logger');

describe('flushEngineState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flushes pending Engine state', () => {
    flushEngineState();

    expect(EngineService.flushState).toHaveBeenCalledTimes(1);
  });

  it('logs Redux delivery errors without throwing', () => {
    const flushError = new Error('Redux store does not exist');
    jest.mocked(EngineService.flushState).mockImplementation(() => {
      throw flushError;
    });

    expect(() => flushEngineState()).not.toThrow();
    expect(Logger.error).toHaveBeenCalledWith(
      flushError,
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'perps',
          component: 'flushEngineState',
          action: 'flush_engine_state',
        }),
      }),
    );
  });
});
