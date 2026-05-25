"""APDU bridge between GATT writes and Speculos TCP.

Handles:
  - Forwarding reassembled APDUs to Speculos
  - Returning responses via GATT notifications
  - Signing APDU detection for test orchestration
  - Error injection for negative tests
"""

from __future__ import annotations

import asyncio
import logging
import time

from .speculos_client import SpeculosTcpClient
from .types import SIGNING_INS_BYTES

logger = logging.getLogger(__name__)


class ApduBridge:
    def __init__(
        self,
        speculos_host: str = "127.0.0.1",
        speculos_apdu_port: int = 9999,
    ) -> None:
        self._speculos = SpeculosTcpClient(speculos_host, speculos_apdu_port)
        self._signing_detected = asyncio.Event()
        self._error_injection: bytes | None = None
        self._connected = False

    async def start(self) -> None:
        await self._speculos.connect()
        self._connected = True

    async def stop(self) -> None:
        await self._speculos.disconnect()
        self._connected = False

    async def handle_apdu(self, apdu: bytes) -> bytes:
        if not self._connected:
            await self.start()

        is_signing = self._is_signing_apdu(apdu)
        if is_signing:
            logger.info("Signing APDU detected (INS=0x%02X)", apdu[1] if len(apdu) > 1 else 0)
            self._signing_detected.set()

        if self._error_injection is not None:
            response = self._error_injection
            self._error_injection = None
            logger.info("Error injection active, returning injected response")
            return response

        response = await self._speculos.exchange(apdu)
        return response

    def inject_error(self, response: bytes) -> None:
        self._error_injection = response

    @property
    def signing_detected(self) -> asyncio.Event:
        return self._signing_detected

    def clear_signing_flag(self) -> None:
        self._signing_detected.clear()

    @property
    def is_connected(self) -> bool:
        return self._connected

    @staticmethod
    def _is_signing_apdu(apdu: bytes) -> bool:
        if len(apdu) < 2:
            return False
        ins = apdu[1]
        return ins in SIGNING_INS_BYTES
