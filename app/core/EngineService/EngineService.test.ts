import EngineService from './EngineService';
import Engine from '../Engine';

describe('EngineService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('should initialize the engine', () => {
    const engineInit = jest.spyOn(Engine, 'init');
    EngineService.initalizeEngine({});
    expect(engineInit).toHaveBeenCalled();
  });
});
