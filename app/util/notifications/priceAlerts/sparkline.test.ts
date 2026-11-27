import { Buffer } from '@craftzdog/react-native-buffer';
import { CachesDirectoryPath, writeFile } from 'react-native-fs';
import { parsePriceAlert } from './payload';
import { writeSparkline } from './sparkline';
import threshold from './samples/threshold.fcm.json';

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  writeFile: jest.fn(),
}));

describe('writeSparkline', () => {
  it('writes a high-resolution branded PNG to the notification cache', async () => {
    const priceAlert = parsePriceAlert(threshold.message.data);
    if (!priceAlert) throw new Error('Invalid threshold fixture');

    const uri = await writeSparkline('threshold', priceAlert);

    expect(uri).toBe(`file://${CachesDirectoryPath}/threshold.png`);
    const [path, base64, encoding] = jest.mocked(writeFile).mock.calls[0];
    expect(path).toBe('/cache/threshold.png');
    expect(encoding).toBe('base64');
    const image = Buffer.from(base64, 'base64');
    expect(image.subarray(1, 4).toString()).toBe('PNG');
    expect(image.readUInt32BE(16)).toBe(900);
    expect(image.readUInt32BE(20)).toBe(450);
  });
});
