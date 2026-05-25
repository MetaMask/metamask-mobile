from __future__ import annotations

import logging

from bumble.transport import open_transport

logger = logging.getLogger(__name__)


async def create_linux_vhci_transport():
    return await open_transport("vhci")


async def create_macos_usb_transport(device_index: int = 0):
    return await open_transport(f"usb:{device_index}")


async def create_hci_socket_transport(device_index: int = 0):
    return await open_transport(f"hci-socket:{device_index}")


async def create_tcp_transport(host: str, port: int):
    return await open_transport(f"tcp-client:{host}:{port}")
