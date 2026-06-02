"""REST control API for test orchestration.

Endpoints for button presses, screenshots, BLE control, error injection,
and signing automation. Runs alongside the virtual BLE device.
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

import aiohttp
from aiohttp import web

from .types import ConnectionState

if TYPE_CHECKING:
    from .device import VirtualLedgerDevice

logger = logging.getLogger(__name__)


class ControlApiServer:
    def __init__(
        self,
        device: "VirtualLedgerDevice",
        host: str = "127.0.0.1",
        port: int = 5002,
    ) -> None:
        self._device = device
        self._host = host
        self._port = port
        self._app = web.Application()
        self._runner: web.AppRunner | None = None
        self._add_routes()

    def _add_routes(self) -> None:
        self._app.add_routes([
            web.get("/health", self._health),
            web.post("/button/press", self._button_press),
            web.get("/screenshot", self._screenshot),
            web.post("/blind-signing/enable", self._blind_signing_enable),
            web.post("/ble/advertise/start", self._advertise_start),
            web.post("/ble/advertise/stop", self._advertise_stop),
            web.get("/ble/connection", self._ble_connection),
            web.post("/ble/disconnect", self._ble_disconnect),
            web.post("/error/inject", self._error_inject),
            web.get("/debug/apdu-log", self._apdu_log),
            web.post("/signing/auto-approve", self._signing_auto_approve),
        ])

    async def start(self) -> None:
        self._runner = web.AppRunner(self._app)
        await self._runner.setup()
        site = web.TCPSite(self._runner, self._host, self._port)
        await site.start()
        logger.info("Control API listening on %s:%d", self._host, self._port)

    async def stop(self) -> None:
        if self._runner:
            await self._runner.cleanup()

    async def _health(self, request: web.Request) -> web.Response:
        return web.json_response({
            "status": "ready",
            "ble_state": self._device.state.value,
            "speculos_connected": self._device.apdu_bridge.is_connected,
        })

    async def _button_press(self, request: web.Request) -> web.Response:
        body = await request.json()
        button = body.get("button", "right")
        count = body.get("count", 1)
        try:
            await self._device.press_button(button, count)
        except Exception as e:
            return web.json_response(
                {"ok": False, "error": str(e)}, status=502
            )
        return web.json_response({"ok": True})

    async def _screenshot(self, request: web.Request) -> web.Response:
        screenshot = await self._device.take_screenshot()
        return web.Response(
            body=screenshot,
            content_type="image/png",
        )

    async def _blind_signing_enable(self, request: web.Request) -> web.Response:
        for _ in range(5):
            await self._device.press_button("right", 1)
            await asyncio.sleep(0.3)
        await self._device.press_button("both", 1)
        return web.json_response({"ok": True})

    async def _advertise_start(self, request: web.Request) -> web.Response:
        await self._device.start_advertising()
        return web.json_response({"ok": True})

    async def _advertise_stop(self, request: web.Request) -> web.Response:
        await self._device.stop_advertising()
        return web.json_response({"ok": True})

    async def _ble_connection(self, request: web.Request) -> web.Response:
        return web.json_response({
            "state": self._device.state.value,
            "has_connection": self._device.gatt_server.connection is not None,
        })

    async def _ble_disconnect(self, request: web.Request) -> web.Response:
        await self._device.disconnect_peer()
        return web.json_response({"ok": True})

    async def _error_inject(self, request: web.Request) -> web.Response:
        body = await request.json()
        error_hex = body.get("response", "6D00")
        error_bytes = bytes.fromhex(error_hex)
        self._device.apdu_bridge.inject_error(error_bytes)
        return web.json_response({"ok": True})

    async def _apdu_log(self, request: web.Request) -> web.Response:
        entries = self._device.gatt_server.apdu_log
        return web.json_response([
            {
                "timestamp": e.timestamp,
                "direction": e.direction,
                "data_hex": e.data.hex(),
                "tag": e.tag,
            }
            for e in entries
        ])

    async def _signing_auto_approve(self, request: web.Request) -> web.Response:
        body = await request.json()
        sequence = body.get("presses", [
            {"button": "right", "count": 4},
            {"button": "both", "count": 1},
        ])
        await self._device.wait_for_signing_and_approve(sequence)
        return web.json_response({"ok": True})
