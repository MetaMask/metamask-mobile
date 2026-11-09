import { InteractionManager } from 'react-native';
import { runAfterInteractions } from './runAfterInteractions';

describe('runAfterInteractions', () => {
  it('schedules the task and returns its cancel handle', () => {
    const cancel = jest.fn();
    const task = jest.fn();
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockReturnValue({
      then: jest.fn(),
      done: jest.fn(),
      cancel,
    } as unknown as ReturnType<typeof InteractionManager.runAfterInteractions>);

    const handle = runAfterInteractions(task);

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalledWith(task);
    handle.cancel();
    expect(cancel).toHaveBeenCalled();
  });
});
