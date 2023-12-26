import pause from './pause';
import { Connection } from '../Connection';

jest.mock('../Connection');

describe('pause', () => {
  let mockConnection: Connection;
  const mockRemotePause = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      remote: {
        pause: mockRemotePause,
      },
      isResumed: true,
    } as unknown as Connection;
  });

  it('should call pause on the remote object', () => {
    pause({ instance: mockConnection });

    expect(mockRemotePause).toHaveBeenCalledTimes(1);
  });

  it('should set isResumed to false', () => {
    pause({ instance: mockConnection });

    expect(mockConnection.isResumed).toBe(false);
  });
});
