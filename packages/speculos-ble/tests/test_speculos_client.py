"""Tests for Speculos TCP client framing."""

import asyncio
import struct
import pytest

from speculos_ble.speculos_client import SpeculosTcpClient


async def _start_echo_server():
    """Start a TCP echo server that mirrors the Speculos protocol.

    Request:  [4-byte BE length] [raw APDU]
    Response: [4-byte BE length] [raw APDU]  (same framing, no len-2 quirk)
    """

    async def handle_client(reader, writer):
        try:
            while True:
                length_data = await reader.readexactly(4)
                length = struct.unpack(">I", length_data)[0]
                apdu = await reader.readexactly(length)
                resp_frame = struct.pack(">I", len(apdu)) + apdu
                writer.write(resp_frame)
                await writer.drain()
        except asyncio.IncompleteReadError:
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    return server, port


@pytest.mark.asyncio
async def test_exchange_simple_apdu():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0xE0, 0x40, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert response == apdu
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_exchange_with_status_word():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0xB0, 0x01, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert response == apdu
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_response_length_encoding():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        await client.connect()
        apdu = bytes([0x01, 0x02, 0x03, 0x04])
        response = await client.exchange(apdu)
        assert response == apdu
        assert len(response) == 4
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_auto_connect_on_exchange():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        assert not client.is_connected
        apdu = bytes([0xB0, 0x01, 0x00, 0x00, 0x00])
        response = await client.exchange(apdu)
        assert client.is_connected
        assert response == apdu
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_disconnect_and_reconnect():
    server, port = await _start_echo_server()

    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        apdu = bytes([0x01])
        await client.connect()
        r1 = await client.exchange(apdu)
        await client.disconnect()
        assert not client.is_connected
        r2 = await client.exchange(apdu)
        assert client.is_connected
        assert r1 == r2 == apdu
    finally:
        await client.disconnect()
        server.close()
        await server.wait_closed()


@pytest.mark.asyncio
async def test_exchange_reconnects_on_connection_drop():
    """When the TCP connection drops, the client reconnects and retries."""
    received_apdus = []

    async def echo_handler(reader, writer):
        try:
            while True:
                length_data = await reader.readexactly(4)
                length = struct.unpack(">I", length_data)[0]
                apdu = await reader.readexactly(length)
                received_apdus.append(apdu)
                response = struct.pack(">I", len(apdu)) + apdu
                writer.write(response)
                await writer.drain()
                writer.close()
                await writer.wait_closed()
                break
        except asyncio.IncompleteReadError:
            pass

    async def create_server(port):
        return await asyncio.start_server(echo_handler, "127.0.0.1", port)

    # Use a fixed port in the ephemeral range
    port = 49152

    server1 = await create_server(port)
    client = SpeculosTcpClient("127.0.0.1", port)
    try:
        apdu = bytes.fromhex("B001000000")

        response1 = await client.exchange(apdu)
        assert response1 == apdu

        server1.close()
        await server1.wait_closed()

        server2 = await create_server(port)

        response2 = await client.exchange(apdu)
        assert response2 == apdu

        assert len(received_apdus) == 2

        server2.close()
        await server2.wait_closed()
    finally:
        await client.disconnect()
