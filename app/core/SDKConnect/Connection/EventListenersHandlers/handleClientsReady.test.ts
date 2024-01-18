import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { Platform } from 'react-native';
import Device from '../../../../util/device';
import Engine from '../../../Engine';
import handleConnectionReady from '../../handlers/handleConnectionReady';
import { Connection } from '../Connection';
import handleClientsReady from './handleClientsReady';

jest.mock('../Connection');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../../../Engine');
jest.mock('../../handlers/handleConnectionReady');
jest.mock('../../../../util/Logger');
jest.mock('../../../../util/device');
jest.mock('../../../NativeModules');
jest.mock('../../../../constants/navigation/Routes');
jest.mock('../../utils/DevLogger');

describe('handleClientsReady', () => {
  let mockInstance: Connection;

  const mockDisapprove = jest.fn();
  const mockUpdateOriginatorInfos = jest.fn();
  const mockApproveHost = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      channelId: 'testChannelId',
      trigger: 'deeplink',
      navigation: { navigate: mockNavigate },
      // other properties of Connection as needed
    } as unknown as Connection;

    Device.isIos = jest.fn().mockReturnValue(true);
    Platform.Version = '17';
  });

  it('should call handleConnectionReady with correct parameters', async () => {
    const mockOriginatorInfo = {} as OriginatorInfo;

    await handleClientsReady({
      instance: mockInstance,
      disapprove: mockDisapprove,
      updateOriginatorInfos: mockUpdateOriginatorInfos,
      approveHost: mockApproveHost,
    })({
      originatorInfo: mockOriginatorInfo,
    });

    expect(handleConnectionReady).toHaveBeenCalledTimes(1);
    expect(handleConnectionReady).toHaveBeenCalledWith({
      originatorInfo: mockOriginatorInfo,
      engine: Engine,
      updateOriginatorInfos: mockUpdateOriginatorInfos,
      approveHost: mockApproveHost,
      onError: expect.any(Function),
      disapprove: mockDisapprove,
      connection: mockInstance,
    });
  });
});
