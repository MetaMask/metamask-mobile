import { Buffer } from '@craftzdog/react-native-buffer';
import { deflate } from 'pako';
import { CachesDirectoryPath, writeFile } from 'react-native-fs';
import { cardArtwork } from './artwork';
import { formatPriceAlert, usd, type PriceAlert } from './payload';

const WIDTH = 900;
const HEIGHT = 450;
const PADDING = 46;
const ORANGE = [250, 75, 0];
const BLUE = [139, 153, 255];
const LIME = [185, 243, 2];
const RED = [255, 117, 132];
const clamp = (value: number) => Math.min(1, Math.max(0, value));

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
  priceAlert: PriceAlert,
): Promise<string> {
  const { points, change, target } = priceAlert;
  const top = 231;
  const bottom = HEIGHT - PADDING;
  const stride = 1 + WIDTH * 3;
  const pixels = Buffer.alloc(stride * HEIGHT);
  const min = Math.min(...points, target ?? Infinity);
  const max = Math.max(...points, target ?? -Infinity);
  const chartY = (value: number) => {
    const fraction = max === min ? 0.5 : (value - min) / (max - min);
    return bottom - fraction * (bottom - top);
  };
  const right = WIDTH - PADDING;
  const endY = chartY(points[points.length - 1]);
  const targetY = target === undefined ? -100 : chartY(target);
  const trend = change >= 0 ? LIME : RED;
  const heights = points.map(chartY);
  for (let x = 0; x < WIDTH; x++) {
    const progress =
      clamp((x - PADDING) / (right - PADDING)) * (points.length - 1);
    const segment = Math.min(heights.length - 2, Math.floor(progress));
    const t = progress - segment;
    const yTrend =
      heights[segment] +
      (heights[segment + 1] - heights[segment]) * t * t * (3 - 2 * t);
    const inChart = x >= PADDING && x <= right;
    for (let y = 0; y < HEIGHT; y++) {
      const orangeGlow = 0.28 * clamp(1 - Math.hypot(x / 420, y / 340)) ** 2;
      const blueGlow =
        0.2 * clamp(1 - Math.hypot((x - WIDTH) / 640, (y - HEIGHT) / 430)) ** 2;
      const fill =
        inChart && y > yTrend
          ? 0.26 *
            clamp((HEIGHT - PADDING - y) / (HEIGHT - PADDING - yTrend || 1))
          : 0;
      const marker =
        inChart && (x - PADDING) % 25 < 13
          ? 0.7 * clamp(1.9 - Math.abs(y - targetY))
          : 0;
      const radius = Math.hypot(x - right, y - endY);
      const line = inChart ? clamp(4 - Math.abs(y - yTrend)) : 0;
      const stroke = Math.max(
        line,
        0.45 * clamp(1 - radius / 29),
        clamp(8 - radius),
      );
      const edge = Math.min(x, WIDTH - 1 - x, y, HEIGHT - 1 - y) < 2 ? 0.14 : 0;
      const offset = y * stride + 1 + x * 3;
      for (let channel = 0; channel < 3; channel++) {
        let color =
          10 + ORANGE[channel] * orangeGlow + BLUE[channel] * blueGlow;
        color += (trend[channel] - color) * fill;
        color += (ORANGE[channel] - color) * marker;
        color += (trend[channel] - color) * stroke;
        color += ((channel === 2 ? 255 : 226) - color) * edge;
        pixels[offset + channel] = Math.round(color);
      }
    }
  }

  const blend = (x: number, y: number, color: number[], opacity: number) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const offset = y * stride + 1 + x * 3;
    for (let channel = 0; channel < 3; channel++) {
      pixels[offset + channel] += Math.round(
        (color[channel] - pixels[offset + channel]) * opacity,
      );
    }
  };
  const art = cardArtwork(blend);
  const pill = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: number[],
    opacity: number,
  ) => {
    const radius = height / 2;
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const dx = Math.max(0, radius - column, column - (width - radius));
        const dy = row - radius;
        blend(
          x + column,
          y + row,
          color,
          opacity * clamp(radius + 0.5 - Math.hypot(dx, dy)),
        );
      }
    }
  };
  const isEthereum = priceAlert.assetId === 'eip155:1/slip44:60';
  if (isEthereum) {
    pill(46, 30, 50, 50, BLUE, 0.22);
    for (let y = 0; y < 33; y++) {
      const width =
        y < 19 ? y * 0.59 : y < 24 ? (24 - y) * 2.2 : (33 - y) * 1.2;
      for (let x = -Math.floor(width); x <= width; x++) {
        blend(71 + x, 39 + y, x < 0 ? [245, 245, 255] : BLUE, 1);
      }
    }
  }
  const white = [255, 255, 255];
  const muted = [163, 164, 167];
  art.text(
    isEthereum ? `${priceAlert.symbol} · Ethereum` : priceAlert.symbol,
    isEthereum ? 113 : 46,
    42,
    0.92,
    white,
  );
  art.fox(WIDTH - 46 - 44, 33);
  const symbol = change >= 0 ? '▲' : '▼';
  const chip = `${symbol} ${formatPriceAlert(priceAlert).change}`;
  const chipWidth = art.textWidth(chip, 0.82) + 35;
  const chipX = WIDTH - PADDING - chipWidth;
  pill(chipX, 103, chipWidth, 47, trend, 0.16);
  art.text(chip, chipX + 17, 113, 0.82, trend);
  const price = usd(priceAlert.price);
  const priceScale = Math.min(
    2.18,
    (chipX - PADDING - 20) / art.textWidth(price, 1),
  );
  art.text(price, PADDING, 87, priceScale, white);
  art.text(
    target === undefined ? priceAlert.description : 'Price target crossed',
    PADDING,
    177,
    0.83,
    muted,
  );
  if (target !== undefined) {
    const label = `Target ${usd(target).replace(/\.00$/u, '')}`;
    const width = art.textWidth(label, 0.59) + 24;
    const y = Math.round(targetY) - 38;
    pill(PADDING, y, width, 33, ORANGE, 0.25);
    art.text(label, PADDING + 12, y + 6, 0.59, [255, 169, 127]);
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
