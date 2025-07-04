import networkChainIdEquals from './networkChainIdEquals';

describe('networkChainIdEquals', () => {
  it.each`
    network                                      | chainId                                      | expected
    ${'eip155:1'}                                | ${'1'}                                       | ${true}
    ${'eip155:1'}                                | ${'2'}                                       | ${false}
    ${'eip155:137'}                              | ${'137'}                                     | ${true}
    ${'137'}                                     | ${'137'}                                     | ${true}
    ${'eip155:56'}                               | ${'56'}                                      | ${true}
    ${'56'}                                      | ${'56'}                                      | ${true}
    ${'eip155:137'}                              | ${'56'}                                      | ${false}
    ${'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'} | ${'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'}        | ${false}
    ${'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'} | ${'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'} | ${true}
    ${'0'}                                       | ${'0'}                                       | ${true}
    ${'bip122:000000000019d6689c085ae165831e93'} | ${'000000000019d6689c085ae165831e93'}        | ${false}
    ${'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'} | ${'differentChainId'}                        | ${false}
    ${'bip122:000000000019d6689c085ae165831e93'} | ${'differentChainId'}                        | ${false}
    ${'eip155:56'}                               | ${'137'}                                     | ${false}
    ${'invalidNetwork'}                          | ${'1'}                                       | ${false}
    ${'eip155'}                                  | ${'1'}                                       | ${false}
    ${''}                                        | ${''}                                        | ${false}
    ${undefined}                                 | ${undefined}                                 | ${false}
  `(
    'returns $expected when network is $network and chainId is $chainId',
    ({ network, chainId, expected }) => {
      expect(networkChainIdEquals(network, chainId)).toBe(expected);
    },
  );
});
