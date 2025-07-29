(function (global, factory) {
  exports && typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
    ? define(['exports'], factory)
    : factory((global.blockies = {}));
})(this, (exports) => {
  'use strict';

  /**
   * A handy class to calculate color values.
   *
   * @version 1.0
   * @author Robert Eisele <robert@xarg.org>
   * @copyright Copyright (c) 2010, Robert Eisele
   * @link http://www.xarg.org/2010/03/generate-client-side-png-files-using-javascript/
   * @license http://www.opensource.org/licenses/bsd-license.php BSD License
   *
   */

  // helper functions for that ctx - optimized for batch operations
  function write(buffer, offs) {
    let offset = offs;
    for (let i = 2; i < arguments.length; i++) {
      const arg = arguments[i];
      const len = arg.length;
      for (let j = 0; j < len; j++) {
        buffer[offset++] = arg.charCodeAt(j);
      }
    }
  }

  function byte2(w) {
    return String.fromCharCode((w >> 8) & 255, w & 255);
  }

  function byte4(w) {
    return String.fromCharCode(
      (w >> 24) & 255,
      (w >> 16) & 255,
      (w >> 8) & 255,
      w & 255,
    );
  }

  function byte2lsb(w) {
    return String.fromCharCode(w & 255, (w >> 8) & 255);
  }

  // Create crc32 lookup table once when module loads
  const _crc32 = new Uint32Array(256);
  (function initCrc32Table() {
    for (var i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        if (c & 1) {
          c = -306674912 ^ ((c >> 1) & 0x7fffffff);
        } else {
          c = (c >> 1) & 0x7fffffff;
        }
      }
      _crc32[i] = c >>> 0; // Ensure unsigned 32-bit integer
    }
  })();

  // Cache for HSL→RGB conversions to avoid redundant calculations
  const hslToRgbCache = new Map();
  const MAX_HSL_CACHE_SIZE = 1000; // Prevent memory leaks

  // Optimized function to convert Uint8Array to string in chunks
  function uint8ArrayToString(uint8Array) {
    const chunkSize = 8192; // Process in 8KB chunks to avoid stack overflow
    let result = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      result += String.fromCharCode.apply(null, chunk);
    }
    return result;
  }

  const PNG = function (width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;

    // pixel data and row filter identifier size
    this.pix_size = height * (width + 1);

    // deflate header, pix_size, block headers, adler32 checksum
    this.data_size =
      2 + this.pix_size + 5 * Math.floor((0xfffe + this.pix_size) / 0xffff) + 4;

    // offsets and sizes of Png chunks
    this.ihdr_offs = 0; // IHDR offset and size
    this.ihdr_size = 4 + 4 + 13 + 4;
    this.plte_offs = this.ihdr_offs + this.ihdr_size; // PLTE offset and size
    this.plte_size = 4 + 4 + 3 * depth + 4;
    this.trns_offs = this.plte_offs + this.plte_size; // tRNS offset and size
    this.trns_size = 4 + 4 + depth + 4;
    this.idat_offs = this.trns_offs + this.trns_size; // IDAT offset and size
    this.idat_size = 4 + 4 + this.data_size + 4;
    this.iend_offs = this.idat_offs + this.idat_size; // IEND offset and size
    this.iend_size = 4 + 4 + 4;
    this.buffer_size = this.iend_offs + this.iend_size; // total PNG size

    this.buffer = new Uint8Array(this.buffer_size);
    this.palette = new Object();
    this.pindex = 0;

    // buffer is already zero-initialized (Uint8Array)

    // initialize non-zero elements
    write(
      this.buffer,
      this.ihdr_offs,
      byte4(this.ihdr_size - 12),
      'IHDR',
      byte4(width),
      byte4(height),
      '\x08\x03',
    );
    write(this.buffer, this.plte_offs, byte4(this.plte_size - 12), 'PLTE');
    write(this.buffer, this.trns_offs, byte4(this.trns_size - 12), 'tRNS');
    write(this.buffer, this.idat_offs, byte4(this.idat_size - 12), 'IDAT');
    write(this.buffer, this.iend_offs, byte4(this.iend_size - 12), 'IEND');

    // initialize deflate header
    let header = ((8 + (7 << 4)) << 8) | (3 << 6);
    header += 31 - (header % 31);

    write(this.buffer, this.idat_offs + 8, byte2(header));

    // initialize deflate block headers
    for (var i = 0; (i << 16) - 1 < this.pix_size; i++) {
      var size, bits;
      if (i + 0xffff < this.pix_size) {
        size = 0xffff;
        bits = '\x00';
      } else {
        size = this.pix_size - (i << 16) - i;
        bits = '\x01';
      }
      write(
        this.buffer,
        this.idat_offs + 8 + 2 + (i << 16) + (i << 2),
        bits,
        byte2lsb(size),
        byte2lsb(~size),
      );
    }

    // compute the index into a png for a given pixel
    this.index = function (x, y) {
      const i = y * (this.width + 1) + x + 1;
      const j = this.idat_offs + 8 + 2 + 5 * Math.floor(i / 0xffff + 1) + i;
      return j;
    };

    // convert a color and build up the palette
    this.color = function (red, green, blue, alpha) {
      alpha = alpha >= 0 ? alpha : 255;
      const color = (((((alpha << 8) | red) << 8) | green) << 8) | blue;

      if (typeof this.palette[color] === 'undefined') {
        if (this.pindex == this.depth) return 0;

        const ndx = this.plte_offs + 8 + 3 * this.pindex;

        this.buffer[ndx + 0] = red;
        this.buffer[ndx + 1] = green;
        this.buffer[ndx + 2] = blue;
        this.buffer[this.trns_offs + 8 + this.pindex] = alpha;

        this.palette[color] = this.pindex++;
      }
      return this.palette[color];
    };

    // output a PNG string, Base64 encoded
    this.getBase64 = function () {
      const s = this.getDump();

      return btoa(s);
    };

    // output a PNG string
    this.getDump = function () {
      // compute adler32 of output pixels + row filter bytes
      const BASE = 65521; /* largest prime smaller than 65536 */
      const NMAX = 5552; /* NMAX is the largest n such that 255n(n+1)/2 + (n+1)(BASE-1) <= 2^32-1 */
      let s1 = 1;
      let s2 = 0;
      let n = NMAX;

      for (let y = 0; y < this.height; y++) {
        for (let x = -1; x < this.width; x++) {
          s1 += this.buffer[this.index(x, y)];
          s2 += s1;
          if ((n -= 1) == 0) {
            s1 %= BASE;
            s2 %= BASE;
            n = NMAX;
          }
        }
      }
      s1 %= BASE;
      s2 %= BASE;
      write(
        this.buffer,
        this.idat_offs + this.idat_size - 8,
        byte4((s2 << 16) | s1),
      );

      // compute crc32 of the PNG chunks
      function crc32(png, offs, size) {
        let crc = -1;
        for (let i = 4; i < size - 4; i += 1) {
          crc =
            _crc32[(crc ^ png[offs + i]) & 0xff] ^
            ((crc >> 8) & 0x00ffffff);
        }
        write(png, offs + size - 4, byte4(crc ^ -1));
      }

      crc32(this.buffer, this.ihdr_offs, this.ihdr_size);
      crc32(this.buffer, this.plte_offs, this.plte_size);
      crc32(this.buffer, this.trns_offs, this.trns_size);
      crc32(this.buffer, this.idat_offs, this.idat_size);
      crc32(this.buffer, this.iend_offs, this.iend_size);

      // convert PNG to string
      return '\x89PNG\r\n\x1A\n' + uint8ArrayToString(this.buffer);
    };

    this.fillRect = function (x, y, w, h, color) {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          this.buffer[this.index(x + i, y + j)] = color;
        }
      }
    };
  };

  // https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
  /**
   * Converts an HSL color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes h, s, and l are contained in the set [0, 1] and
   * returns r, g, and b in the set [0, 255].
   *
   * @param   {number}  h       The hue
   * @param   {number}  s       The saturation
   * @param   {number}  l       The lightness
   * @return  {Array}           The RGB representation
   */

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hsl2rgb(h, s, l) {
    // Create cache key
    const key = `${h.toFixed(3)},${s.toFixed(3)},${l.toFixed(3)}`;
    
    if (hslToRgbCache.has(key)) {
      return hslToRgbCache.get(key);
    }

    let r, g, b;

    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const result = new Uint8Array([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255]);
    
    // Implement simple LRU: remove oldest if cache is full
    if (hslToRgbCache.size >= MAX_HSL_CACHE_SIZE) {
      const firstKey = hslToRgbCache.keys().next().value;
      hslToRgbCache.delete(firstKey);
    }
    
    hslToRgbCache.set(key, result);
    return result;
  }

  // The random number is a js implementation of the Xorshift PRNG
  const randseed = new Uint32Array(4); // Xorshift: [x, y, z, w] 32 bit values

  function seedrand(seed) {
    for (var i = 0; i < randseed.length; i++) {
      randseed[i] = 0;
    }
    for (var i = 0; i < seed.length; i++) {
      randseed[i % 4] =
        (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
    }
  }

  function rand() {
    // based on Java's String.hashCode(), expanded to 4 32bit values
    const t = randseed[0] ^ (randseed[0] << 11);

    randseed[0] = randseed[1];
    randseed[1] = randseed[2];
    randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

    return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
  }

  function createColor() {
    //saturation is the whole color spectrum
    const h = Math.floor(rand() * 360);
    //saturation goes from 40 to 100, it avoids greyish colors
    const s = rand() * 60 + 40;
    //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
    const l = (rand() + rand() + rand() + rand()) * 25;

    return [h / 360, s / 100, l / 100];
  }



  function createImageData(size) {
    const width = size; // Only support square icons for now
    const height = size;

    const dataWidth = Math.ceil(width / 2);
    const mirrorWidth = width - dataWidth;

    const data = new Uint8Array(size * size);
    let dataIndex = 0;
    
    for (let y = 0; y < height; y++) {
      const row = new Uint8Array(width);
      for (let x = 0; x < dataWidth; x++) {
        // this makes foreground and background color to have a 43% (1/2.3) probability
        // spot color has 13% chance
        row[x] = Math.floor(rand() * 2.3);
      }
      // Mirror the row
      for (let x = 0; x < mirrorWidth; x++) {
        row[dataWidth + x] = row[mirrorWidth - 1 - x];
      }

      // Copy row to data
      for (let i = 0; i < row.length; i++) {
        data[dataIndex++] = row[i];
      }
    }

    return data;
  }

  function buildOpts(opts) {
    if (!opts.seed) {
      throw new Error('No seed provided');
    }

    seedrand(opts.seed);

    return Object.assign(
      {
        size: 8,
        scale: 16,
        color: createColor(),
        bgcolor: createColor(),
        spotcolor: createColor(),
      },
      opts,
    );
  }

  function toDataUrl(address) {
    const cache = Blockies.cache[address];
    if (address && cache) {
      return cache;
    }

    const opts = buildOpts({ seed: address.toLowerCase() });

    const imageData = createImageData(opts.size);
    const width = opts.size; // We know it's square, so no need for Math.sqrt

    const p = new PNG(opts.size * opts.scale, opts.size * opts.scale, 3);
    const bgcolor = p.color(...hsl2rgb(...opts.bgcolor));
    const color = p.color(...hsl2rgb(...opts.color));
    const spotcolor = p.color(...hsl2rgb(...opts.spotcolor));

    for (let i = 0; i < imageData.length; i++) {
      const row = Math.floor(i / width);
      const col = i % width;
      // if data is 0, leave the background
      if (imageData[i]) {
        // if data is 2, choose spot color, if 1 choose foreground
        const pngColor = imageData[i] == 1 ? color : spotcolor;
        p.fillRect(
          col * opts.scale,
          row * opts.scale,
          opts.scale,
          opts.scale,
          pngColor,
        );
      }
    }
    const ret = `data:image/png;base64,${p.getBase64()}`;
    Blockies.cache[address] = ret;
    return ret;
  }

  exports.toDataUrl = toDataUrl;

  Object.defineProperty(exports, '__esModule', { value: true });
});

/**
 * Utility class with the single responsibility
 * of caching Blockies Data URIs
 */
class Blockies {
  static cache = {};
}
