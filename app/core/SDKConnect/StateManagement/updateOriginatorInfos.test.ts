import { RemoteConnectionInfo } from '../types/RemoteConnectionInfo';
import StorageWrapper from '../../../store/storage-wrapper';
import SDKConnect from '../SDKConnect';
import updateOriginatorInfos from './updateOriginatorInfos';

jest.mock('../SDKConnect');
jest.mock('../../../store/storage-wrapper');
jest.mock('../../AppConstants');

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
}));

describe('updateOriginatorInfos', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockStorageWrapperSet = StorageWrapper.setItem as jest.MockedFunction<
    typeof StorageWrapper.setItem
  >;

  const mockEmit = jest.fn();

  const spyWarn = jest.spyOn(console, 'warn');

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorageWrapperSet.mockResolvedValue(undefined);

    mockInstance = {
      state: {
        connections: {},
      },
      emit: mockEmit,
    } as unknown as SDKConnect;
  });

  it('should warn and return if no connection exists', () => {
    const mockChannelId = 'mockChannelId';
    const mockOriginatorInfo = {} as RemoteConnectionInfo;

    updateOriginatorInfos({
      channelId: mockChannelId,
      originatorInfo: mockOriginatorInfo,
      instance: mockInstance,
    });

    expect(spyWarn).toHaveBeenCalledWith(
      'SDKConnect::updateOriginatorInfos - no connection',
    );
  });

  it('should update originatorInfo for the connection', () => {
    const mockChannelId = 'mockChannelId';
    const mockOriginatorInfo = {} as RemoteConnectionInfo;
    mockInstance.state.connections[mockChannelId] = {
      originatorInfo: {} as RemoteConnectionInfo,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    updateOriginatorInfos({
      channelId: mockChannelId,
      originatorInfo: mockOriginatorInfo,
      instance: mockInstance,
    });

    expect(mockInstance.state.connections[mockChannelId].originatorInfo).toBe(
      mockOriginatorInfo,
    );
  });
});
