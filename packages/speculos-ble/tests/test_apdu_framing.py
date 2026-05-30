"""Tests for APDU fragmentation and reassembly."""

import struct
import pytest

from speculos_ble.apdu_framing import fragment_apdu, ApduReassembler
from speculos_ble.types import BLE_TAG_ID


class TestFragmentApdu:
    def test_single_byte_apdu(self):
        chunks = fragment_apdu(bytes([0xE0]), mtu=23)
        assert len(chunks) == 1
        tag, idx, total = struct.unpack_from(">BHH", chunks[0], 0)
        assert tag == BLE_TAG_ID
        assert idx == 0
        assert total == 1
        assert chunks[0][5:] == bytes([0xE0])

    def test_apdu_fits_single_chunk(self):
        apdu = bytes(range(15))
        chunks = fragment_apdu(apdu, mtu=23)
        assert len(chunks) == 1
        header = chunks[0][:5]
        tag, idx, total = struct.unpack_from(">BHH", header, 0)
        assert tag == BLE_TAG_ID
        assert idx == 0
        assert total == 15
        assert chunks[0][5:] == apdu

    def test_apdu_requires_two_chunks(self):
        mtu = 23
        max_payload_0 = mtu - 5  # 18 bytes in first chunk
        max_payload_1 = mtu - 3  # 20 bytes in subsequent chunks
        apdu = bytes(range(max_payload_0 + 5))  # 23 bytes total
        chunks = fragment_apdu(apdu, mtu)

        assert len(chunks) == 2

        tag0, idx0, total0 = struct.unpack_from(">BHH", chunks[0], 0)
        assert tag0 == BLE_TAG_ID
        assert idx0 == 0
        assert total0 == len(apdu)
        assert chunks[0][5:] == apdu[:max_payload_0]

        tag1, idx1 = struct.unpack_from(">BH", chunks[1], 0)
        assert tag1 == BLE_TAG_ID
        assert idx1 == 1
        assert chunks[1][3:] == apdu[max_payload_0:]

    def test_large_apdu_many_chunks(self):
        mtu = 23
        apdu = bytes(range(200))
        chunks = fragment_apdu(apdu, mtu)

        reassembler = ApduReassembler()
        for chunk in chunks:
            result = reassembler.feed(chunk)
            if result is not None:
                assert result == apdu
                return
        pytest.fail("Should have reassembled the complete APDU")

    def test_exact_mtu_boundary(self):
        mtu = 23
        apdu = bytes(range(mtu - 5))  # exactly fills first chunk
        chunks = fragment_apdu(apdu, mtu)
        assert len(chunks) == 1

    def test_mtu_too_small(self):
        with pytest.raises(ValueError, match="MTU too small"):
            fragment_apdu(bytes([0x01]), mtu=5)

    def test_empty_apdu(self):
        chunks = fragment_apdu(b"", mtu=23)
        assert len(chunks) == 0

    def test_high_mtu_single_chunk(self):
        apdu = bytes(range(100))
        chunks = fragment_apdu(apdu, mtu=156)
        assert len(chunks) == 1
        tag, idx, total = struct.unpack_from(">BHH", chunks[0], 0)
        assert total == 100


class TestApduReassembler:
    def test_single_chunk_reassembly(self):
        reassembler = ApduReassembler()
        frame = struct.pack(">BHH", BLE_TAG_ID, 0, 3) + bytes([0xA0, 0xB0, 0xC0])
        result = reassembler.feed(frame)
        assert result == bytes([0xA0, 0xB0, 0xC0])

    def test_multi_chunk_reassembly(self):
        reassembler = ApduReassembler()
        mtu = 23
        apdu = bytes(range(30))

        chunks = fragment_apdu(apdu, mtu)
        results = []
        for chunk in chunks:
            r = reassembler.feed(chunk)
            if r is not None:
                results.append(r)

        assert len(results) == 1
        assert results[0] == apdu

    def test_wrong_tag_ignored(self):
        reassembler = ApduReassembler()
        frame = struct.pack(">BHH", 0xFF, 0, 3) + bytes([0x01, 0x02, 0x03])
        result = reassembler.feed(frame)
        assert result is None

    def test_out_of_order_chunk_resets(self):
        reassembler = ApduReassembler()
        chunk0 = struct.pack(">BHH", BLE_TAG_ID, 0, 10) + bytes(range(5))
        chunk2 = struct.pack(">BH", BLE_TAG_ID, 2) + bytes(range(5))

        reassembler.feed(chunk0)
        result = reassembler.feed(chunk2)
        assert result is None

    def test_reset_clears_state(self):
        reassembler = ApduReassembler()
        frame = struct.pack(">BHH", BLE_TAG_ID, 0, 100) + bytes(range(5))
        reassembler.feed(frame)
        reassembler.reset()

        short_frame = struct.pack(">BHH", BLE_TAG_ID, 0, 3) + bytes([1, 2, 3])
        result = reassembler.feed(short_frame)
        assert result == bytes([1, 2, 3])

    def test_frame_too_short(self):
        reassembler = ApduReassembler()
        assert reassembler.feed(bytes([0x05])) is None
        assert reassembler.feed(bytes([0x05, 0x00])) is None

    def test_roundtrip_all_sizes(self):
        for size in [1, 5, 18, 20, 50, 100, 200, 255]:
            mtu = 23
            apdu = bytes(range(size))
            chunks = fragment_apdu(apdu, mtu)
            reassembler = ApduReassembler()
            result = None
            for chunk in chunks:
                result = reassembler.feed(chunk)
            assert result == apdu, f"Roundtrip failed for size {size}"


class TestLedgerTransportCompatibility:
    def test_getAddress_apdu_roundtrip(self):
        apdu = bytes.fromhex("E002000014058000002C8000003C800000008000000000000000")
        chunks = fragment_apdu(apdu, mtu=150)
        assert len(chunks) == 1

        reassembler = ApduReassembler()
        result = reassembler.feed(chunks[0])
        assert result == apdu

    def test_signTransaction_large_apdu_roundtrip(self):
        apdu = bytes([0xE0, 0x04, 0x00, 0x00]) + bytes(range(200))
        chunks = fragment_apdu(apdu, mtu=23)
        assert len(chunks) > 1

        reassembler = ApduReassembler()
        final = None
        for chunk in chunks:
            final = reassembler.feed(chunk)
        assert final == apdu

    def test_mtu_probe_not_mangled(self):
        reassembler = ApduReassembler()
        probe = bytes([0x08, 0x00, 0x00, 0x00, 0x00, 0x9C, 0x00])
        result = reassembler.feed(probe)
        assert result is None

    def test_mtu_156_single_chunk_getAddress(self):
        apdu = bytes.fromhex("E002000014058000002C8000003C800000008000000000000000")
        chunks = fragment_apdu(apdu, mtu=156)
        assert len(chunks) == 1
        tag, idx, total = struct.unpack_from(">BHH", chunks[0])
        assert tag == BLE_TAG_ID
        assert idx == 0
        assert total == len(apdu)

    def test_send_format_matches_ledgerhq(self):
        apdu = bytes([0xE0, 0x02, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04])
        mtu = 23
        chunks = fragment_apdu(apdu, mtu)

        assert chunks[0][0] == 0x05
        seq_idx = struct.unpack_from(">H", chunks[0], 1)[0]
        assert seq_idx == 0
        total_len = struct.unpack_from(">H", chunks[0], 3)[0]
        assert total_len == len(apdu)
        assert chunks[0][5:] == apdu[: mtu - 5]

        if len(chunks) > 1:
            assert chunks[1][0] == 0x05
            seq_idx_1 = struct.unpack_from(">H", chunks[1], 1)[0]
            assert seq_idx_1 == 1
            assert chunks[1][3:] == apdu[mtu - 5 :]

    def test_receive_chunk0_header_layout(self):
        reassembler = ApduReassembler()
        data = bytes([0xAA, 0xBB, 0xCC])
        frame = struct.pack(">BHH", 0x05, 0, len(data)) + data

        result = reassembler.feed(frame)
        assert result == data

    def test_receive_rejects_wrong_tag_like_ledgerhq(self):
        reassembler = ApduReassembler()
        frame = bytes([0x06, 0x00, 0x00, 0x00, 0x03, 0x01, 0x02, 0x03])
        result = reassembler.feed(frame)
        assert result is None
