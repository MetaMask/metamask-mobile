"""CLI entry point for speculos-ble."""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys

import click

from .device import VirtualLedgerDevice
from .types import (
    DEFAULT_CONTROL_API_PORT,
    DEFAULT_DEVICE_NAME,
    DEFAULT_SPECULOS_APDU_PORT,
    DEFAULT_SPECULOS_API_PORT,
    DEFAULT_SPECULOS_HOST,
    VirtualLedgerConfig,
)

logger = logging.getLogger(__name__)


def _netsim_ini_path() -> str | None:
    from bumble.transport.android_netsim import get_ini_dir, ini_file_name

    ini_dir = get_ini_dir()
    if ini_dir is None:
        return None
    return str(ini_dir / ini_file_name(0))


async def _wait_for_netsim(timeout: float = 30.0) -> None:
    import time

    ini_path = _netsim_ini_path()
    if ini_path is None:
        raise RuntimeError(
            "Cannot determine netsim ini directory for this platform"
        )

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if os.path.exists(ini_path):
            logger.info("Found netsim config at %s", ini_path)
            return
        await asyncio.sleep(0.5)
    raise FileNotFoundError(
        f"netsim.ini not found after {timeout}s. Expected at: {ini_path}"
    )


@click.command()
@click.option(
    "--transport",
    type=click.Choice(["vhci", "usb", "hci-socket", "android-netsim"]),
    default="vhci",
    help="BLE transport backend",
)
@click.option(
    "--device-name",
    default=DEFAULT_DEVICE_NAME,
    help="BLE advertising name",
)
@click.option(
    "--speculos-host",
    default=DEFAULT_SPECULOS_HOST,
    help="Speculos host",
)
@click.option(
    "--speculos-apdu-port",
    default=DEFAULT_SPECULOS_APDU_PORT,
    type=int,
    help="Speculos TCP APDU port",
)
@click.option(
    "--speculos-api-port",
    default=DEFAULT_SPECULOS_API_PORT,
    type=int,
    help="Speculos REST API port",
)
@click.option(
    "--control-api-port",
    default=DEFAULT_CONTROL_API_PORT,
    type=int,
    help="Control REST API port",
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="Enable debug logging",
)
def main(
    transport: str,
    device_name: str,
    speculos_host: str,
    speculos_apdu_port: int,
    speculos_api_port: int,
    control_api_port: int,
    verbose: bool,
) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    transport_map = {
        "vhci": "vhci",
        "usb": "usb:0",
        "hci-socket": "hci-socket:0",
        "android-netsim": "android-netsim",
    }

    config = VirtualLedgerConfig(
        transport=transport_map.get(transport, transport),
        device_name=device_name,
        speculos_host=speculos_host,
        speculos_apdu_port=speculos_apdu_port,
        speculos_api_port=speculos_api_port,
        control_api_port=control_api_port,
    )

    device = VirtualLedgerDevice(config)

    loop = asyncio.new_event_loop()

    def _shutdown(signum, frame):
        logger.info("Received signal %s, shutting down", signum)
        loop.call_soon_threadsafe(
            lambda: asyncio.ensure_future(device.stop()),
        )

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    try:
        if transport == "android-netsim":
            logger.info("Waiting for android-netsim readiness...")
            loop.run_until_complete(_wait_for_netsim())

        loop.run_until_complete(device.start())
        logger.info("Virtual Ledger device running. Press Ctrl+C to stop.")
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        loop.run_until_complete(device.stop())
        loop.close()


if __name__ == "__main__":
    main()
