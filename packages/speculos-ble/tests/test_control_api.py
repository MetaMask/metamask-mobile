"""Tests for ControlApiServer REST endpoints."""

from __future__ import annotations

import pytest
import pytest_asyncio
from aiohttp.test_utils import TestClient, TestServer

from speculos_ble.control_api import ControlApiServer
from speculos_ble.types import ConnectionState


class FakeDevice:
    def __init__(self):
        self._state = ConnectionState.ADVERTISING
        self.apdu_bridge = self._FakeBridge()
        self.gatt_server = self._FakeGatt()
        self._button_presses = []

    @property
    def state(self):
        return self._state

    async def press_button(self, button, count=1):
        self._button_presses.append((button, count))

    async def take_screenshot(self):
        return b"\x89PNG\r\n\x1a\n" + b"\x00" * 100

    async def start_advertising(self):
        pass

    async def stop_advertising(self):
        pass

    async def disconnect_peer(self):
        pass

    async def wait_for_signing_and_approve(self, sequence, timeout=60.0):
        self._button_presses.extend(
            (step["button"], step.get("count", 1)) for step in sequence
        )

    class _FakeBridge:
        is_connected = True

        def inject_error(self, response):
            pass

    class _FakeGatt:
        connection = None
        apdu_log = []


@pytest_asyncio.fixture
async def api_server():
    fake_device = FakeDevice()
    server = ControlApiServer(device=fake_device, port=0)
    await server.start()
    yield server, fake_device
    await server.stop()


@pytest_asyncio.fixture
async def client(api_server):
    server, fake_device = api_server
    tc = TestClient(TestServer(server._app))
    await tc.start_server()
    tc._fake_device = fake_device
    yield tc
    await tc.close()


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status == 200
    body = await resp.json()
    assert body["status"] == "ready"
    assert "ble_state" in body
    assert body["speculos_connected"] is True


@pytest.mark.asyncio
async def test_button_press(client):
    resp = await client.post("/button/press", json={"button": "right", "count": 3})
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True
    assert ("right", 3) in client._fake_device._button_presses


@pytest.mark.asyncio
async def test_screenshot(client):
    resp = await client.get("/screenshot")
    assert resp.status == 200
    assert resp.content_type == "image/png"
    data = await resp.read()
    assert len(data) > 0


@pytest.mark.asyncio
async def test_ble_connection(client):
    resp = await client.get("/ble/connection")
    assert resp.status == 200
    body = await resp.json()
    assert "state" in body
    assert "has_connection" in body


@pytest.mark.asyncio
async def test_error_inject(client):
    resp = await client.post("/error/inject", json={"response": "6985"})
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True


@pytest.mark.asyncio
async def test_apdu_log(client):
    resp = await client.get("/debug/apdu-log")
    assert resp.status == 200
    body = await resp.json()
    assert isinstance(body, list)


@pytest.mark.asyncio
async def test_signing_auto_approve(client):
    resp = await client.post(
        "/signing/auto-approve",
        json={
            "presses": [
                {"button": "right", "count": 2},
                {"button": "both", "count": 1},
            ],
        },
    )
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True
    assert ("right", 2) in client._fake_device._button_presses


@pytest.mark.asyncio
async def test_advertise_start(client):
    resp = await client.post("/ble/advertise/start")
    assert resp.status == 200


@pytest.mark.asyncio
async def test_advertise_stop(client):
    resp = await client.post("/ble/advertise/stop")
    assert resp.status == 200


@pytest.mark.asyncio
async def test_blind_signing_enable(client):
    resp = await client.post("/blind-signing/enable")
    assert resp.status == 200
    body = await resp.json()
    assert body["ok"] is True
