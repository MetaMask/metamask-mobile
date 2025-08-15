import Device from '../../../../util/device';

export function getOtpCellSize() {
  const [minSize, maxSize] = [40, 50];
  const screenWidth = Device.getDeviceWidth();
  const containerPadding = 15;
  const gap = 5;
  const cellCount = 6;
  const availableWidth = screenWidth - 2 * containerPadding;
  const boxSize = Math.floor(
    (availableWidth - (cellCount - 1) * gap) / cellCount,
  );
  return Math.max(minSize, Math.min(maxSize, boxSize));
}
