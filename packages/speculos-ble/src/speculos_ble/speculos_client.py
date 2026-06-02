"""TCP client for Speculos APDU exchange.

Protocol:
  Request:  [4-byte BE length] [raw APDU]
  Response: [4-byte BE length] [response data] [2-byte SW]

The 4-byte length prefix covers the data only; the 2-byte SW follows.
"""

from __future__ import annotations

import asyncio
import struct
import logging

logger = logging.getLogger(__name__)


class SpeculosTimeoutError(Exception):
    """Raised when a Speculos TCP operation times out."""


class SpeculosTcpClient:
    def __init__(self, host: str = "127.0.0.1", port: int = 9999, timeout: float = 30.0) -> None:
        self._host = host
        self._port = port
        self._timeout = timeout
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> None:
        if self._writer is not None and not self._writer.is_closing():
            return
        logger.info("Connecting to Speculos at %s:%d", self._host, self._port)
        self._reader, self._writer = await asyncio.open_connection(
            self._host, self._port,
        )
        logger.info("Connected to Speculos")

    async def disconnect(self) -> None:
        if self._writer is not None:
            self._writer.close()
            try:
                await self._writer.wait_closed()
            except Exception:
                pass
            self._writer = None
            self._reader = None
        logger.info("Disconnected from Speculos")

    async def exchange(self, apdu: bytes) -> bytes:
        async with self._lock:
            try:
                if self._writer is None or self._reader is None:
                    await self.connect()

                await self._send(apdu)
                return await self._recv()
            except asyncio.TimeoutError:
                msg = (
                    f"Speculos operation timed out after {self._timeout}s "
                    f"(APDU: {apdu.hex()})"
                )
                logger.error(msg)
                await self.disconnect()
                raise SpeculosTimeoutError(msg) from None
            except (ConnectionError, OSError, asyncio.IncompleteReadError):
                logger.warning("Speculos connection lost, reconnecting")
                await self.disconnect()
                await self.connect()
                await self._send(apdu)
                return await self._recv()

    async def _send(self, apdu: bytes) -> None:
        assert self._writer is not None
        length_prefix = struct.pack(">I", len(apdu))
        self._writer.write(length_prefix + apdu)
        await asyncio.wait_for(self._writer.drain(), timeout=self._timeout)
        logger.debug("Sent APDU (%d bytes): %s", len(apdu), apdu.hex())

    async def _recv(self) -> bytes:
        assert self._reader is not None
        length_data = await asyncio.wait_for(
            self._reader.readexactly(4), timeout=self._timeout,
        )
        raw_length = struct.unpack(">I", length_data)[0]
        response = await asyncio.wait_for(
            self._reader.readexactly(raw_length), timeout=self._timeout,
        )
        sw = await asyncio.wait_for(
            self._reader.readexactly(2), timeout=self._timeout,
        )
        full_response = response + sw
        logger.debug("Recv APDU (%d bytes): %s", len(full_response), full_response.hex())
        return full_response

    @property
    def is_connected(self) -> bool:
        return self._writer is not None and not self._writer.is_closing()
