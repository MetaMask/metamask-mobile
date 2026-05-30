"""Integration tests — require running Speculos + speculos-ble.

Run with: RUN_INTEGRATION_TESTS=1 pytest tests/test_integration_android.py -v
Skip otherwise (default).
"""

from __future__ import annotations

import os

import aiohttp
import pytest
import pytest_asyncio

CONTROL_API = os.environ.get("CONTROL_API_URL", "http://127.0.0.1:5002")
SPECULOS_API = os.environ.get("SPECULOS_API_URL", "http://127.0.0.1:5100")


def _is_integration_enabled():
    return os.environ.get("RUN_INTEGRATION_TESTS", "").lower() in ("1", "true", "yes")


pytestmark = pytest.mark.skipif(
    not _is_integration_enabled(),
    reason="Integration tests disabled. Set RUN_INTEGRATION_TESTS=1 to enable.",
)


@pytest_asyncio.fixture
async def http():
    async with aiohttp.ClientSession() as session:
        yield session


@pytest.mark.asyncio
async def test_control_api_health(http):
    async with http.get(f"{CONTROL_API}/health") as resp:
        assert resp.status == 200
        body = await resp.json()
        assert body["status"] == "ready"


@pytest.mark.asyncio
async def test_speculos_api_ping(http):
    async with http.get(f"{SPECULOS_API}/ping") as resp:
        assert resp.status == 200


@pytest.mark.asyncio
async def test_button_press_and_screenshot(http):
    async with http.post(
        f"{CONTROL_API}/button/press",
        json={"button": "right", "count": 1},
    ) as resp:
        assert resp.status == 200

    async with http.get(f"{CONTROL_API}/screenshot") as resp:
        assert resp.status == 200
        data = await resp.read()
        assert len(data) > 100
        assert data[:4] == b"\x89PNG"


@pytest.mark.asyncio
async def test_apdu_exchange_via_speculos(http):
    """Send a getAppNameAndVersion APDU (B0 01 00 00 00) via Speculos HTTP API."""
    async with http.post(
        f"{SPECULOS_API}/apdu",
        json={"data": "B001000000"},
    ) as resp:
        assert resp.status == 200
        body = await resp.json()
        assert "data" in body
        data = bytes.fromhex(body["data"])
        sw = (data[-2] << 8) | data[-1]
        assert sw == 0x9000


@pytest.mark.asyncio
async def test_ble_connection_state(http):
    async with http.get(f"{CONTROL_API}/ble/connection") as resp:
        assert resp.status == 200
        body = await resp.json()
        assert "state" in body


@pytest.mark.asyncio
async def test_error_injection(http):
    async with http.post(
        f"{CONTROL_API}/error/inject",
        json={"response": "6985"},
    ) as resp:
        assert resp.status == 200
        body = await resp.json()
        assert body["ok"] is True


@pytest.mark.asyncio
async def test_advertise_start_stop(http):
    async with http.post(f"{CONTROL_API}/ble/advertise/stop") as resp:
        assert resp.status == 200
    async with http.post(f"{CONTROL_API}/ble/advertise/start") as resp:
        assert resp.status == 200
