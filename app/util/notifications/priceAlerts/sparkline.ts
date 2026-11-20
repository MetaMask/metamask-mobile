import { Buffer } from '@craftzdog/react-native-buffer';
import { deflate } from 'pako';
import { CachesDirectoryPath, writeFile } from 'react-native-fs';

const WIDTH = 480;
const HEIGHT = 176;
const PADDING = 24;
const BACKGROUND = [31, 27, 33];
const ORANGE = [246, 133, 27];
const GREEN = [105, 226, 162];
const RED = [255, 138, 138];

function pngChunk(type: string, bytes: Uint8Array): Buffer {
  const chunk = Buffer.alloc(12 + bytes.length);
  chunk.writeUInt32BE(bytes.length);
  chunk.write(type, 4);
  chunk.set(bytes, 8);
  let crc = -1;
  for (const byte of chunk.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  chunk.writeUInt32BE(~crc >>> 0, chunk.length - 4);
  return chunk;
}

export async function writeSparkline(
  id: string,
  points: number[],
  change: number,
  target?: number,
): Promise<string> {
  const stride = 1 + WIDTH * 3;
  const pixels = Buffer.alloc(stride * HEIGHT);
  const pixel = (x: number, y: number, color: number[]) => {
    pixels.set(color, y * stride + 1 + x * 3);
  };

  const min = Math.min(...points, target ?? Infinity);
  const max = Math.max(...points, target ?? -Infinity);
  const chartY = (value: number) => {
    const fraction = max === min ? 0.5 : (value - min) / (max - min);
    return Math.round(HEIGHT - PADDING - fraction * (HEIGHT - 2 * PADDING));
  };
  const targetY = target === undefined ? -1 : chartY(target);
  const trendColor = change >= 0 ? GREEN : RED;

  for (let x = 0; x < WIDTH; x++) {
    const progress =
      ((x - PADDING) / (WIDTH - 2 * PADDING)) * (points.length - 1);
    const segment = Math.floor(progress);
    const chartVisible = segment >= 0 && segment < points.length - 1;
    const yTrend = chartVisible
      ? chartY(
          points[segment] +
            (points[segment + 1] - points[segment]) * (progress - segment),
        )
      : -10;

    for (let y = 0; y < HEIGHT; y++) {
      let color = BACKGROUND;
      if (
        Math.abs(y - targetY) <= 1 &&
        x >= PADDING &&
        x <= WIDTH - PADDING &&
        x % 12 < 7
      ) {
        color = ORANGE;
      }
      if (Math.abs(y - yTrend) <= 2) {
        color = trendColor;
      }
      pixel(x, y, color);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH);
  header.writeUInt32BE(HEIGHT, 4);
  header.set([8, 2], 8);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflate(pixels)),
    pngChunk('IEND', new Uint8Array()),
  ]);
  const path = `${CachesDirectoryPath}/${id}.png`;
  await writeFile(path, png.toString('base64'), 'base64');
  return `file://${path}`;
}
