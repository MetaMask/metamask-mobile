"""Tests for ApduBridge signing detection and error injection."""

import asyncio
import pytest
from unittest.mock import AsyncMock

from speculos_ble.apdu_bridge import ApduBridge
from speculos_ble.types import SIGNING_INS_BYTES


class TestSigningDetection:
    def test_sign_personal_message(self):
        apdu = bytes([0xE0, 0x08, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        assert ApduBridge._is_signing_apdu(apdu)

    def test_sign_eip712(self):
        apdu = bytes([0xE0, 0x0C, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        assert ApduBridge._is_signing_apdu(apdu)

    def test_sign_eip1559(self):
        apdu = bytes([0xE0, 0x20, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        assert ApduBridge._is_signing_apdu(apdu)

    def test_sign_eip2930(self):
        apdu = bytes([0xE0, 0x22, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        assert ApduBridge._is_signing_apdu(apdu)

    def test_get_public_key(self):
        apdu = bytes([0xE0, 0x02, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        assert ApduBridge._is_signing_apdu(apdu)

    def test_non_signing_apdu(self):
        apdu = bytes([0xE0, 0x10, 0x00, 0x00, 0x00])
        assert not ApduBridge._is_signing_apdu(apdu)

    def test_too_short_apdu(self):
        assert not ApduBridge._is_signing_apdu(bytes([0xE0]))
        assert not ApduBridge._is_signing_apdu(b"")

    def test_all_signing_ins_bytes(self):
        for ins in SIGNING_INS_BYTES:
            apdu = bytes([0xE0, ins, 0x00, 0x00, 0x00])
            assert ApduBridge._is_signing_apdu(apdu), f"INS 0x{ins:02X} not detected"


class TestErrorInjection:
    def test_inject_error(self):
        bridge = ApduBridge()
        bridge.inject_error(bytes([0x6D, 0x00]))
        assert bridge._error_injection == bytes([0x6D, 0x00])

    def test_error_cleared_after_use_flag(self):
        bridge = ApduBridge()
        bridge.inject_error(bytes([0x6D, 0x00]))
        assert bridge._error_injection is not None
        bridge._error_injection = None
        assert bridge._error_injection is None


class TestApduBridgeAsync:
    @pytest.mark.asyncio
    async def test_handle_apdu_calls_speculos_exchange(self):
        bridge = ApduBridge()
        mock_response = bytes([0x90, 0x00])
        bridge._speculos.exchange = AsyncMock(return_value=mock_response)
        bridge._speculos.connect = AsyncMock()
        bridge._speculos.disconnect = AsyncMock()
        await bridge.start()

        result = await bridge.handle_apdu(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        assert result == mock_response
        bridge._speculos.exchange.assert_called_once()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_signing_detected_event(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        bridge._speculos.connect = AsyncMock()
        bridge._speculos.disconnect = AsyncMock()
        await bridge.start()

        bridge.clear_signing_flag()
        assert not bridge.signing_detected.is_set()
        await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert bridge.signing_detected.is_set()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_error_injection_returns_injected(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        bridge._speculos.connect = AsyncMock()
        bridge._speculos.disconnect = AsyncMock()
        await bridge.start()

        bridge.inject_error(bytes([0x69, 0x85]))
        result = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert result == bytes([0x69, 0x85])
        bridge._speculos.exchange.assert_not_called()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_error_injection_cleared_after_use(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        bridge._speculos.connect = AsyncMock()
        bridge._speculos.disconnect = AsyncMock()
        await bridge.start()

        bridge.inject_error(bytes([0x69, 0x85]))
        r1 = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert r1 == bytes([0x69, 0x85])
        assert bridge._error_injection is None
        await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        bridge._speculos.exchange.assert_called_once()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_non_signing_apdu_does_not_set_event(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        bridge._speculos.connect = AsyncMock()
        bridge._speculos.disconnect = AsyncMock()
        await bridge.start()

        bridge.clear_signing_flag()
        await bridge.handle_apdu(bytes([0xE0, 0x10, 0x00, 0x00, 0x00]))
        assert not bridge.signing_detected.is_set()
        await bridge.stop()
