import { sortBalanceChanges } from './sortBalanceChanges';
import { AssetType, BalanceChange } from './types';

describe('sortBalanceChanges', () => {
  // Create a mock balance change object.
  const bc = (type: AssetType): BalanceChange =>
    ({ asset: { type } } as BalanceChange);

  it.each([
    {
      criteria: 'token standard',
      balanceChanges: [
        bc(AssetType.ERC721),
        bc(AssetType.ERC20),
        bc(AssetType.ERC1155),
        bc(AssetType.Native),
      ],
      expectedOrder: [
        bc(AssetType.Native),
        bc(AssetType.ERC20),
        bc(AssetType.ERC721),
        bc(AssetType.ERC1155),
      ],
    },
  ])(
    'should sort balance changes based on $criteria',
    ({ balanceChanges, expectedOrder }) => {
      const sorted = sortBalanceChanges(balanceChanges);
      expect(sorted).toEqual(expectedOrder);
    },
  );
});
