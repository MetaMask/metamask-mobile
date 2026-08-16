"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateERC20TransferData = void 0;
/**
 * Portable ERC-20 transfer data generation.
 * Only the 'transfer(address,uint256)' case is needed by PerpsController.
 *
 * Uses @metamask/abi-utils (core package with proper TypeScript types)
 * and @metamask/utils for hex conversion.
 */
const abi_utils_1 = require("@metamask/abi-utils");
const utils_1 = require("@metamask/utils");
/** ERC-20 transfer function selector: transfer(address,uint256) */
const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';
/**
 * Generate ERC-20 transfer calldata.
 *
 * @param toAddress - Recipient address (0x-prefixed hex string)
 * @param amount - Transfer amount (0x-prefixed hex string)
 * @returns Hex-encoded calldata for ERC-20 transfer
 */
function generateERC20TransferData(toAddress, amount) {
    if (!toAddress || !amount) {
        throw new Error("[transferData] 'toAddress' and 'amount' must be defined for ERC-20 transfer");
    }
    const encoded = (0, abi_utils_1.encode)(['address', 'uint256'], [toAddress, amount]);
    // bytesToHex returns '0x...' prefixed string; strip the '0x' prefix
    // since we prepend the function selector ourselves
    const encodedHex = (0, utils_1.bytesToHex)(encoded).slice(2);
    return TRANSFER_FUNCTION_SIGNATURE + encodedHex;
}
exports.generateERC20TransferData = generateERC20TransferData;
//# sourceMappingURL=transferData.cjs.map