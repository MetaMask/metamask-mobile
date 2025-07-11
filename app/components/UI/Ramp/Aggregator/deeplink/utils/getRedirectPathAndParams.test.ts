import getRedirectPathsAndParams from './getRedirectPathAndParams';

describe('getRedirectPathsAndParams', () => {
  it('returns empty values for empty paths', () => {
    expect(getRedirectPathsAndParams('')).toStrictEqual([[], undefined]);
  });

  it.each`
    rampPath                                         | expected
    ${''}                                            | ${[[], undefined]}
    ${'?'}                                           | ${[[], undefined]}
    ${'//example'}                                   | ${[['example'], undefined]}
    ${'//example?'}                                  | ${[['example'], undefined]}
    ${'//example/path'}                              | ${[['example', 'path'], undefined]}
    ${'///example//long/path'}                       | ${[['example', 'long', 'path'], undefined]}
    ${'///example//long/path?'}                      | ${[['example', 'long', 'path'], undefined]}
    ${'?chainId=1'}                                  | ${[[], { chainId: '1' }]}
    ${'?chainId=1&amount=4.20'}                      | ${[[], { chainId: '1', amount: '4.20' }]}
    ${'//example?chainId=1'}                         | ${[['example'], { chainId: '1' }]}
    ${'//example?chainId=1&amount=4.20'}             | ${[['example'], { chainId: '1', amount: '4.20' }]}
    ${'//example/path?chainId=1&amount=4.20'}        | ${[['example', 'path'], { chainId: '1', amount: '4.20' }]}
    ${'////example////path?chainId=1&amount=4.20&&'} | ${[['example', 'path'], { chainId: '1', amount: '4.20' }]}
  `(
    'returns the expected value for rampPath $rampPath',
    ({ rampPath, expected }) => {
      expect(getRedirectPathsAndParams(rampPath)).toStrictEqual(expected);
    },
  );
});
