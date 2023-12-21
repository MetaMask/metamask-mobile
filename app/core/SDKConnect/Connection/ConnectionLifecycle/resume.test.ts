import resume from './resume';
import { Connection } from '../Connection';
import DevLogger from '../../utils/DevLogger';

jest.mock('../Connection');
jest.mock('../../utils/DevLogger');

describe('resume', () => {
  let mockConnection: Connection;
  const mockRemoteResume = jest.fn();
  const mockSetLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      channelId: 'testChannelId',
      remote: {
        resume: mockRemoteResume,
      },
      isResumed: false,
      setLoading: mockSetLoading,
    } as unknown as Connection;
  });

  it('should log the resume action with the channel ID', () => {
    resume({ instance: mockConnection });

    expect(DevLogger.log).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      `Connection::resume() id=testChannelId`,
    );
  });

  it('should call resume on the remote object', () => {
    resume({ instance: mockConnection });

    expect(mockRemoteResume).toHaveBeenCalledTimes(1);
  });

  it('should set isResumed to true', () => {
    resume({ instance: mockConnection });

    expect(mockConnection.isResumed).toBe(true);
  });

  it('should set loading to false', () => {
    resume({ instance: mockConnection });

    expect(mockSetLoading).toHaveBeenCalledTimes(1);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
