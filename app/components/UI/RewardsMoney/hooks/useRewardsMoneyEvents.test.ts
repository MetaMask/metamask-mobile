import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine/Engine';
import { useRewardsMoneyEvents } from './useRewardsMoneyEvents';

jest.mock('../../../../core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

const mockedMessenger = jest.mocked(Engine.controllerMessenger);

describe('useRewardsMoneyEvents', () => {
  const events = ['RewardsMoneyController:earningsUpdated'] as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to every event on mount', () => {
    const callback = jest.fn();

    renderHook(() => useRewardsMoneyEvents(events, callback));

    expect(mockedMessenger.subscribe).toHaveBeenCalledWith(
      'RewardsMoneyController:earningsUpdated',
      callback,
    );
  });

  it('unsubscribes from every event on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() =>
      useRewardsMoneyEvents(events, callback),
    );

    unmount();

    expect(mockedMessenger.unsubscribe).toHaveBeenCalledWith(
      'RewardsMoneyController:earningsUpdated',
      callback,
    );
  });

  it('subscribes to each event in a multi-event list', () => {
    const multiple = [
      'RewardsMoneyController:earningsUpdated',
      'RewardsMoneyController:stateChange',
    ] as const;

    renderHook(() => useRewardsMoneyEvents(multiple, jest.fn()));

    expect(mockedMessenger.subscribe).toHaveBeenCalledTimes(2);
  });
});
