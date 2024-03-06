import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import DefaultPreference from 'react-native-default-preference';
import SDKConnect from '../SDKConnect';
import updateOriginatorInfos from './updateOriginatorInfos';

jest.mock('@metamask/sdk-communication-layer');
jest.mock('../SDKConnect');
jest.mock('react-native-default-preference');
jest.mock('../../AppConstants');

describe('updateOriginatorInfos', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockDefaultPreferenceSet = DefaultPreference.set as jest.MockedFunction<
    typeof DefaultPreference.set
  >;

  const mockEmit = jest.fn();

  const spyWarn = jest.spyOn(console, 'warn');

  beforeEach(() => {
    jest.clearAllMocks();

    mockDefaultPreferenceSet.mockResolvedValue(undefined);

    mockInstance = {
      state: {
        connections: {},
      },
      emit: mockEmit,
    } as unknown as SDKConnect;
  });

  it('should warn and return if no connection exists', () => {
    const mockChannelId = 'mockChannelId';
    const mockOriginatorInfo = {} as OriginatorInfo;

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
    const mockOriginatorInfo = {} as OriginatorInfo;
    mockInstance.state.connections[mockChannelId] = {
      originatorInfo: {} as OriginatorInfo,
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
