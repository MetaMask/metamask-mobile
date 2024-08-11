import { BigNumber } from 'ethers';
import { getTokenIdParam } from './Transaction.utils';
import { LogDescription } from '@ethersproject/abi';

describe('Transaction util :: getTokenIdParam', () => {
  it('should return correct tokenId for ERC721', () => {
    const mockTokenData = {
      contract: '0x142e91caea2f44b433a24653c90438b8ef87bae8',
      eventFragment: {
        name: 'Transfer',
        anonymous: false,
        inputs: [
          {
            name: '_from',
            type: 'address',
            indexed: true,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: 'address',
            _isParamType: true,
          },
          {
            name: '_to',
            type: 'address',
            indexed: true,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: 'address',
            _isParamType: true,
          },
          {
            name: '_tokenId',
            type: 'uint256',
            indexed: true,
            components: null,
            arrayLength: null,
            arrayChildren: null,
            baseType: 'uint256',
            _isParamType: true,
          },
        ],
        type: 'event',
        _isFragment: true,
      },
      name: 'Transfer',
      signature: 'Transfer(address,address,uint256)',
      topic:
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      args: {
        _from: '0xa259af9db8172F62EF0373d7DfA893a3e245ACE9',
        _to: '0xAC7985f2E57609bdd7AD3003E4bE868d83E4b6d5',
        _tokenId: BigNumber.from('0x0e'),
      },
    };
    const tokenId = getTokenIdParam(mockTokenData as unknown as LogDescription);
    expect(tokenId).toBe('14');
  });

  it('should return correct tokenId for ERC1155', () => {
    const mockTokenData = {
      contract: '0x142e91caea2f44b433a24653c90438b8ef87bae8',
      name: 'TransferSingle',
      signature: 'Transfer(address,address,uint256)',
      topic:
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      args: {
        operator: '0xa259af9db8172F62EF0373d7DfA893a3e245ACE9',
        from: '0xa259af9db8172F62EF0373d7DfA893a3e245ACE9',
        to: '0xAC7985f2E57609bdd7AD3003E4bE868d83E4b6d5',
        id: BigNumber.from('0x03'),
        value: 5,
      },
    };
    const tokenId = getTokenIdParam(mockTokenData as unknown as LogDescription);
    expect(tokenId).toBe('3');
  });
});
