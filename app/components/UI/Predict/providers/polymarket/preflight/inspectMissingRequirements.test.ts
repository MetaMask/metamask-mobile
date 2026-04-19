import { inspectMissingRequirements } from './inspectMissingRequirements';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

const requirements: V2AllowanceRequirement[] = [
  {
    type: 'erc20-allowance',
    tokenAddress: '0x1000000000000000000000000000000000000000',
    spender: '0x2000000000000000000000000000000000000000',
  },
  {
    type: 'erc20-allowance',
    tokenAddress: '0x1000000000000000000000000000000000000000',
    spender: '0x3000000000000000000000000000000000000000',
  },
  {
    type: 'erc1155-operator',
    tokenAddress: '0x4000000000000000000000000000000000000000',
    operator: '0x5000000000000000000000000000000000000000',
  },
];

describe('inspectMissingRequirements', () => {
  it('returns an empty array when nothing is missing', async () => {
    const missing = await inspectMissingRequirements({
      address: '0x1111111111111111111111111111111111111111',
      requirements,
      readAllowance: jest.fn().mockResolvedValue(1n),
      readIsApprovedForAll: jest.fn().mockResolvedValue(true),
    });

    expect(missing).toEqual([]);
  });

  it('returns missing erc20 requirements in input order', async () => {
    const readAllowance = jest
      .fn()
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(1n);

    const missing = await inspectMissingRequirements({
      address: '0x1111111111111111111111111111111111111111',
      requirements,
      readAllowance,
      readIsApprovedForAll: jest.fn().mockResolvedValue(true),
    });

    expect(missing).toEqual([requirements[0]]);
  });

  it('returns missing erc1155 requirements', async () => {
    const missing = await inspectMissingRequirements({
      address: '0x1111111111111111111111111111111111111111',
      requirements,
      readAllowance: jest.fn().mockResolvedValue(1n),
      readIsApprovedForAll: jest.fn().mockResolvedValue(false),
    });

    expect(missing).toEqual([requirements[2]]);
  });

  it('returns mixed missing requirements without reordering', async () => {
    const readAllowance = jest
      .fn()
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(0n);

    const missing = await inspectMissingRequirements({
      address: '0x1111111111111111111111111111111111111111',
      requirements,
      readAllowance,
      readIsApprovedForAll: jest.fn().mockResolvedValue(false),
    });

    expect(missing).toEqual(requirements);
  });
});
