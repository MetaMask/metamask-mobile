import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * Completes a WebSocket handshake on an incoming HTTP upgrade request.
 * Text frames only. Enough for the relay's small JSON messages.
 *
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:stream').Duplex} socket
 * @param {Buffer} head
 * @param {{ onText: (text: string) => void, onClose: () => void }} handlers
 */
export function acceptWebSocket(request, socket, head, handlers) {
  const key = request.headers['sec-websocket-key'];
  if (!key) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }

  const accept = createHash('sha1')
    .update(key + GUID)
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  let buffer = head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);

  const onData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    buffer = consumeFrames(socket, buffer, handlers);
  };

  socket.on('data', onData);
  socket.on('close', handlers.onClose);
  socket.on('error', handlers.onClose);
}

/**
 * @param {import('node:stream').Duplex} socket
 * @param {string} text
 */
export function sendText(socket, text) {
  if (socket.destroyed) {
    return;
  }
  const payload = Buffer.from(text);
  const header = encodeHeader(payload.length);
  socket.write(Buffer.concat([header, payload]));
}

function encodeHeader(length) {
  if (length < 126) {
    return Buffer.from([0x81, length]);
  }
  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return header;
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return header;
}

function consumeFrames(socket, buffer, handlers) {
  while (buffer.length >= 2) {
    const opcode = buffer[0] & 0x0f;
    const masked = (buffer[1] & 0x80) !== 0;
    let length = buffer[1] & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (buffer.length < 4) {
        return buffer;
      }
      length = buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (buffer.length < 10) {
        return buffer;
      }
      length = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }

    const maskLength = masked ? 4 : 0;
    if (buffer.length < offset + maskLength + length) {
      return buffer;
    }

    const payload = Buffer.from(
      buffer.subarray(offset + maskLength, offset + maskLength + length),
    );
    if (masked) {
      const mask = buffer.subarray(offset, offset + 4);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }
    buffer = buffer.subarray(offset + maskLength + length);

    if (opcode === 0x8) {
      socket.end();
      handlers.onClose();
      return Buffer.alloc(0);
    }
    if (opcode === 0x9) {
      const pong = Buffer.concat([
        Buffer.from([0x8a, payload.length]),
        payload,
      ]);
      socket.write(pong);
      continue;
    }
    if (opcode === 0x1) {
      handlers.onText(payload.toString('utf8'));
    }
  }
  return buffer;
}
