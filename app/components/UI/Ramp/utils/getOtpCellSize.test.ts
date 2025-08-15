import { getOtpCellSize } from './getOtpCellSize';
import Device from '../../../../util/device';

jest.mock('../../../../util/device');

describe('getOtpCellSize', () => {
  const mockDevice = Device as jest.Mocked<typeof Device>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return minimum size (40) when calculated size is below minimum', () => {
    mockDevice.getDeviceWidth.mockReturnValue(280);

    const result = getOtpCellSize();

    expect(result).toBe(40);
    expect(mockDevice.getDeviceWidth).toHaveBeenCalledTimes(1);
  });

  it('should return maximum size (50) when calculated size is above maximum', () => {
    mockDevice.getDeviceWidth.mockReturnValue(400);

    const result = getOtpCellSize();

    expect(result).toBe(50);
    expect(mockDevice.getDeviceWidth).toHaveBeenCalledTimes(1);
  });

  it('should return calculated size when it falls within min/max bounds', () => {
    mockDevice.getDeviceWidth.mockReturnValue(350);

    const result = getOtpCellSize();

    expect(result).toBe(49);
    expect(mockDevice.getDeviceWidth).toHaveBeenCalledTimes(1);
  });
});
