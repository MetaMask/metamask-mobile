import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import approveHost from './approveHost';

jest.mock('../../../core/AppConstants');
jest.mock('../SDKConnect');
jest.mock('../SDKConnectConstants');
jest.mock('../utils/DevLogger');
jest.mock('../../../store/async-storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(JSON.stringify({})),
}));

describe('approveHost', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        disabledHosts: {},
        approvedHosts: {},
        connections: {},
        connected: {},
      },
      emit: jest.fn(),
    } as unknown as SDKConnect;
  });

  it('should handle approval for non-disabled hosts', () => {
    const mockHost = 'mockHost';
    const mockApprovedUntil = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
    jest
      .spyOn(JSON, 'stringify')
      .mockReturnValueOnce('mockStringifiedApprovedHosts');

    approveHost({
      host: mockHost,
      instance: mockInstance,
    });

    expect(DevLogger.log).toHaveBeenCalledWith(
      `SDKConnect approveHost ${mockHost}`,
      mockInstance.state.approvedHosts,
    );
  });

  it('should update the approved hosts list in the instance state', () => {
    const mockHost = 'mockHost';
    const mockApprovedUntil = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
    jest
      .spyOn(JSON, 'stringify')
      .mockReturnValueOnce('mockStringifiedApprovedHosts');

    approveHost({
      host: mockHost,
      instance: mockInstance,
    });

    expect(mockInstance.state.approvedHosts[mockHost]).toEqual(
      mockApprovedUntil + DEFAULT_SESSION_TIMEOUT_MS,
    );
  });

  it('should update the last authorized time for relevant connections', () => {
    const mockHost = 'mockHost';
    const mockChannelId = mockHost.replace(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      '',
    );

    const mockApprovedUntil = 1234567890;

    mockInstance.state.connections[mockChannelId] = {
      lastAuthorized: 0,
    } as unknown as SDKConnect['state']['connections'][string];

    jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
    jest
      .spyOn(JSON, 'stringify')
      .mockReturnValueOnce('mockStringifiedApprovedHosts');

    approveHost({
      host: mockHost,
      instance: mockInstance,
    });

    expect(
      mockInstance.state.connections[mockChannelId].lastAuthorized,
    ).toEqual(mockApprovedUntil + DEFAULT_SESSION_TIMEOUT_MS);
  });

  it('should update the last authorized time for relevant connected channels', () => {
    const mockHost = 'mockHost';
    const mockChannelId = mockHost.replace(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      '',
    );
    const mockApprovedUntil = 1234567890;

    mockInstance.state.connected[mockChannelId] = {
      lastAuthorized: 0,
    } as unknown as SDKConnect['state']['connected'][string];

    jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
    jest
      .spyOn(JSON, 'stringify')
      .mockReturnValueOnce('mockStringifiedApprovedHosts');

    approveHost({
      host: mockHost,
      instance: mockInstance,
    });

    expect(mockInstance.state.connected[mockChannelId].lastAuthorized).toEqual(
      mockApprovedUntil + DEFAULT_SESSION_TIMEOUT_MS,
    );
  });

  it('should save the updated approved hosts list in DefaultPreference', () => {
    const mockHost = 'mockHost';
    const mockApprovedUntil = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
    jest
      .spyOn(JSON, 'stringify')
      .mockReturnValueOnce('mockStringifiedApprovedHosts');

    approveHost({
      host: mockHost,
      instance: mockInstance,
    });
  });

  describe('Handling disabled hosts', () => {
    it('should have some specific handling for disabled hosts', () => {
      const mockHost = 'mockHost';
      const mockApprovedUntil = 1234567890;

      jest.spyOn(Date, 'now').mockReturnValueOnce(mockApprovedUntil);
      jest
        .spyOn(JSON, 'stringify')
        .mockReturnValueOnce('mockStringifiedApprovedHosts');

      approveHost({
        host: mockHost,
        instance: mockInstance,
      });

      expect(mockInstance.state.disabledHosts[mockHost]).toBeUndefined();
    });
  });
});
