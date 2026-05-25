"""Shared test fixtures and mocks."""
from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock

import pytest


def _make_bumble_mock() -> types.ModuleType:
    bumble = types.ModuleType("bumble")
    gatt = types.ModuleType("bumble.gatt")
    device = types.ModuleType("bumble.device")

    _Props = type("Properties", (), {"WRITE": 2, "WRITE_WITHOUT_RESPONSE": 4, "READ": 1, "NOTIFY": 16})
    _Access = type("Access", (), {"WRITEABLE": 2, "READABLE": 1})

    class _CharacteristicValue:
        def __init__(self, **kw):
            self._cb = kw.get("write")

    class _Characteristic:
        Properties = _Props
        WRITEABLE = _Access.WRITEABLE
        READABLE = _Access.READABLE

        def __init__(self, uuid, props, access, value=None, **kw):
            self.uuid = uuid
            self.properties = props
            self.access = access
            self.value = value
            self._handlers = {}

        def on(self, event, handler):
            self._handlers[event] = handler

    class _Service:
        def __init__(self, uuid, chars=None, **kw):
            self.uuid = uuid
            self.characteristics = chars or []

    gatt.Characteristic = _Characteristic
    gatt.CharacteristicValue = _CharacteristicValue
    gatt.Service = _Service
    bumble.gatt = gatt
    bumble.device = device

    return bumble


bumble_mock = _make_bumble_mock()
sys.modules.setdefault("bumble", bumble_mock)
sys.modules.setdefault("bumble.gatt", bumble_mock.gatt)
sys.modules.setdefault("bumble.device", bumble_mock.device)
