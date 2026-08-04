import {
  endLiveActivitiesFromPreviousLaunch,
  resetLiveActivityReconciliationForTests,
} from './reconcileLiveActivities';

function createFactory(instanceCount: number) {
  const instances = Array.from({ length: instanceCount }, () => ({
    end: jest.fn().mockResolvedValue(undefined),
  }));
  return {
    getInstances: jest.fn().mockReturnValue(instances),
    instances,
  };
}

describe('endLiveActivitiesFromPreviousLaunch', () => {
  beforeEach(() => {
    resetLiveActivityReconciliationForTests();
  });

  it('ends every activity left over from a previous launch', async () => {
    const factory = createFactory(2);

    await endLiveActivitiesFromPreviousLaunch(factory);

    expect(factory.instances[0].end).toHaveBeenCalledWith('immediate');
    expect(factory.instances[1].end).toHaveBeenCalledWith('immediate');
  });

  it('does nothing on a launch with no leftover activities', async () => {
    const factory = createFactory(0);

    await endLiveActivitiesFromPreviousLaunch(factory);

    expect(factory.getInstances).toHaveBeenCalledTimes(1);
  });

  it('only reconciles once per process, so a second feature cannot end the first one\u2019s live activity', async () => {
    const first = createFactory(1);
    const second = createFactory(1);

    await endLiveActivitiesFromPreviousLaunch(first);
    await endLiveActivitiesFromPreviousLaunch(second);

    expect(first.instances[0].end).toHaveBeenCalledTimes(1);
    expect(second.getInstances).not.toHaveBeenCalled();
  });

  it('resolves even when ending an activity rejects', async () => {
    const factory = createFactory(1);
    factory.instances[0].end.mockRejectedValue(new Error('not found'));

    await expect(
      endLiveActivitiesFromPreviousLaunch(factory),
    ).resolves.toBeUndefined();
  });
});
