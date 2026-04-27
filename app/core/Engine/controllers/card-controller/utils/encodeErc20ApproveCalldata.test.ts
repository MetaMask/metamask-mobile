import { ethers } from 'ethers';
import { encodeErc20ApproveCalldata } from './encodeErc20ApproveCalldata';

describe('encodeErc20ApproveCalldata', () => {
  it('matches ethers Interface encoding for approve', () => {
    const spender = '0x000000000000000000000000000000000000dEaD';
    const value = '1000000';
    const iface = new ethers.utils.Interface([
      'function approve(address spender, uint256 value)',
    ]);
    const expected = iface.encodeFunctionData('approve', [spender, value]);
    expect(encodeErc20ApproveCalldata(spender, value)).toBe(expected);
  });

  it('encodes large uint256 string values', () => {
    const spender = '0x1111111111111111111111111111111111111111';
    const value =
      '999999999999999999999999999000000000000000000000000000000000000';
    const out = encodeErc20ApproveCalldata(spender, value);
    expect(out).toMatch(/^0x/);
    expect(out.length).toBeGreaterThan(10);
  });
});
