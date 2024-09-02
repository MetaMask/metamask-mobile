import SharedDrawerStatusTracker from './DrawerStatusTracker';

describe('DrawerStatusTracker', () => {
  beforeEach(() => {
    SharedDrawerStatusTracker.init();
  });

  it('should initialize with closed status', () => {
    expect(SharedDrawerStatusTracker.getStatus()).toBe('closed');
  });

  it('should set status to open', () => {
    SharedDrawerStatusTracker.setStatus('open');
    expect(SharedDrawerStatusTracker.getStatus()).toBe('open');
  });

  it('should set status to closed', () => {
    SharedDrawerStatusTracker.setStatus('closed');
    expect(SharedDrawerStatusTracker.getStatus()).toBe('closed');
  });

  it('should emit events when status changes', () => {
    const openHandler = jest.fn();
    const closeHandler = jest.fn();

    SharedDrawerStatusTracker.hub.on('drawer::open', openHandler);
    SharedDrawerStatusTracker.hub.on('drawer::closed', closeHandler);

    SharedDrawerStatusTracker.setStatus('open');
    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(closeHandler).not.toHaveBeenCalled();

    SharedDrawerStatusTracker.setStatus('closed');
    expect(openHandler).toHaveBeenCalledTimes(1);
    expect(closeHandler).toHaveBeenCalledTimes(1);
  });
});
