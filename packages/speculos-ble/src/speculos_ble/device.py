"""Virtual Ledger device — main orchestrator.

Wires together:
  - Bumble Device (advertising, connections)
  - LedgerGattServer (GATT service with APDU characteristics)
  - ApduBridge (GATT ↔ Speculos TCP relay)
  - ControlApiServer (REST API for test orchestration)
  - Connection lifecycle state machine
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import aiohttp

from bumble import data_types
from bumble.core import AdvertisingData, UUID
from bumble.device import Device, Connection
from bumble.hci import Address
from bumble.pairing import PairingConfig, PairingDelegate
from bumble.transport import open_transport

from .apdu_bridge import ApduBridge
from .control_api import ControlApiServer
from .gatt_server import LedgerGattServer
from .types import (
    ConnectionState,
    DEFAULT_DEVICE_NAME,
    LEDGER_SERVICE_UUID,
    VirtualLedgerConfig,
)

logger = logging.getLogger(__name__)


class VirtualLedgerDevice(Device.Listener, Connection.Listener):
    def __init__(self, config: VirtualLedgerConfig) -> None:
        self._config = config
        self._state = ConnectionState.IDLE

        self.apdu_bridge = ApduBridge(
            speculos_host=config.speculos_host,
            speculos_apdu_port=config.speculos_apdu_port,
        )

        self.gatt_server = LedgerGattServer(
            on_apdu=self.apdu_bridge.handle_apdu,
            on_mtu_probe=self._handle_mtu_probe,
            apdu_log_size=config.apdu_log_size,
        )

        self._control_api = ControlApiServer(
            device=self,
            port=config.control_api_port,
        )

        self._device: Device | None = None
        self._transport: Any = None
        self._connection: Connection | None = None
        self._http_session: aiohttp.ClientSession | None = None

    @property
    def state(self) -> ConnectionState:
        return self._state

    def _set_state(self, state: ConnectionState) -> None:
        logger.info("State: %s → %s", self._state.value, state.value)
        self._state = state

    async def start(self) -> None:
        self._set_state(ConnectionState.ADVERTISING)

        self._transport = await open_transport(self._config.transport)

        random_address = self._generate_random_address()

        self._device = Device.with_hci(
            name=self._config.device_name,
            address=random_address,
            hci_source=self._transport.source,
            hci_sink=self._transport.sink,
        )

        self._device.listener = self
        self._device.pairing_config_factory = lambda connection: PairingConfig(
            sc=True,
            mitm=False,
            bonding=False,
            delegate=PairingDelegate(
                io_capability=PairingDelegate.IoCapability.NO_OUTPUT_NO_INPUT,
            ),
        )

        self.gatt_server.bind(self._device)
        self._device.add_services([self.gatt_server.service])

        self._device.advertising_data = bytes(
            AdvertisingData([
                data_types.CompleteListOf128BitServiceUUIDs([UUID(LEDGER_SERVICE_UUID)]),
                data_types.ShortenedLocalName(self._config.device_name[:8]),
            ])
        )
        self._device.scan_response_data = bytes(
            AdvertisingData([
                data_types.CompleteLocalName(self._config.device_name),
            ])
        )

        await self._device.power_on()
        await self._device.start_advertising(
            auto_restart=self._config.auto_restart_advertising,
        )

        await self.apdu_bridge.start()
        await self._control_api.start()

        logger.info(
            "Virtual Ledger device '%s' ready (address: %s)",
            self._config.device_name,
            random_address,
        )

    async def stop(self) -> None:
        self._set_state(ConnectionState.DISCONNECTING)

        await self._control_api.stop()
        await self.apdu_bridge.stop()

        if self._http_session and not self._http_session.closed:
            await self._http_session.close()

        if self._device:
            await self._device.stop_advertising()
            await self._device.power_off()

        if self._transport:
            await self._transport.close()

        self._set_state(ConnectionState.IDLE)

    async def start_advertising(self) -> None:
        if self._device:
            await self._device.start_advertising(
                auto_restart=self._config.auto_restart_advertising,
            )

    async def stop_advertising(self) -> None:
        if self._device:
            await self._device.stop_advertising()

    async def disconnect_peer(self) -> None:
        if self._connection:
            await self._connection.disconnect()

    @staticmethod
    def _generate_random_address() -> Address:
        random_bytes = bytearray(os.urandom(6))
        random_bytes[0] |= 0xC0
        addr_str = ":".join(f"{b:02X}" for b in random_bytes)
        return Address(addr_str)

    async def _handle_mtu_probe(self, connection: Connection, value: bytes) -> None:
        negotiated_mtu = connection.att_mtu
        self.gatt_server.set_mtu(negotiated_mtu)
        logger.info("MTU probe handled, negotiated MTU: %d", negotiated_mtu)

        mtu_value = max(negotiated_mtu, 23)
        probe_response = bytes(
            [0x08, 0x00, 0x00, 0x00, 0x00, mtu_value & 0xFF, (mtu_value >> 8) & 0xFF]
        )
        await self.gatt_server.send_raw_notification(connection, probe_response)

    def _get_http_session(self) -> aiohttp.ClientSession:
        if self._http_session is None or self._http_session.closed:
            self._http_session = aiohttp.ClientSession()
        return self._http_session

    async def press_button(self, button: str, count: int = 1) -> None:
        session = self._get_http_session()
        url = (
            f"http://{self._config.speculos_host}:{self._config.speculos_api_port}"
            f"/button/{button}"
        )
        for _ in range(count):
            async with session.post(url, json={"action": "press-and-release"}) as resp:
                resp.raise_for_status()
            await asyncio.sleep(0.1)

    async def take_screenshot(self) -> bytes:
        session = self._get_http_session()
        url = (
            f"http://{self._config.speculos_host}:{self._config.speculos_api_port}"
            f"/screenshot"
        )
        async with session.get(url) as resp:
            resp.raise_for_status()
            return await resp.read()

    async def wait_for_signing_and_approve(
        self,
        sequence: list[dict[str, Any]],
        timeout: float = 60.0,
    ) -> None:
        self.apdu_bridge.clear_signing_flag()
        await asyncio.wait_for(
            self.apdu_bridge.signing_detected.wait(),
            timeout=timeout,
        )
        for step in sequence:
            await self.press_button(step["button"], step.get("count", 1))

    def on_connection(self, connection: Connection) -> None:
        logger.info("BLE connected: %s", connection)
        self._connection = connection
        connection.listener = self
        self._set_state(ConnectionState.CONNECTED)

    def on_disconnection(self, reason: int) -> None:
        logger.info("BLE disconnected: reason=%s", reason)
        self._connection = None
        self.gatt_server.reset()
        if self._state != ConnectionState.DISCONNECTING:
            self._set_state(ConnectionState.IDLE)

    def on_connection_att_mtu_update(self) -> None:
        pass
