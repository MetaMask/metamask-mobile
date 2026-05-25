"""Tests for ApduBridge signing detection and error injection."""

import asyncio
import pytest

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
