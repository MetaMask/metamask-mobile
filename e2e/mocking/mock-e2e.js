import nock from 'nock';

/**
 * Setup E2E network mocks.
 *
 * @param {Function} testSpecificMock - A function for setting up test-specific network mocks
 * @param {object} options - Network mock options.
 * @param {string} options.chainId - The chain ID used by the default configured network.
 * @returns
 */
async function setupMocking({ chainId }) {
  //nock.recorder.rec();

  nock('https://sentry.io/api/0000000')
    .persist()
    .post('/envelope')
    .reply(200, {})
    .post('/store')
    .reply(200, {});

  nock('https://www.4byte.directory/api/v1/signatures/')
    .persist()
    .get()
    .reply(200, {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          created_at: null,
          text_signature: 'deposit()',
          hex_signature: null,
          bytes_signature: null,
        },
      ],
    });

  nock(`https://gas-api.metaswap.codefi.network/networks/${chainId}`)
    .persist()
    .get('/gasPrices')
    .reply(200, {
      SafeGasPrice: '1',
      ProposeGasPrice: '2',
      FastGasPrice: '3',
    })
    .get('/suggestedGasFees')
    .reply(200, {
      low: {
        suggestedMaxPriorityFeePerGas: '1',
        suggestedMaxFeePerGas: '20.44436136',
        minWaitTimeEstimate: 15000,
        maxWaitTimeEstimate: 30000,
      },
      medium: {
        suggestedMaxPriorityFeePerGas: '2.5',
        suggestedMaxFeePerGas: '25.80554517',
        minWaitTimeEstimate: 15000,
        maxWaitTimeEstimate: 45000,
      },
      high: {
        suggestedMaxPriorityFeePerGas: '3',
        suggestedMaxFeePerGas: '27.277766977',
        minWaitTimeEstimate: 15000,
        maxWaitTimeEstimate: 60000,
      },
      estimatedBaseFee: '19.444436136',
      networkCongestion: 0.14685,
      latestPriorityFeeRange: ['0.378818859', '6.555563864'],
      historicalPriorityFeeRange: ['0.1', '248.262969261'],
      historicalBaseFeeRange: ['14.146999781', '28.825256275'],
      priorityFeeTrend: 'down',
      baseFeeTrend: 'up',
    });

  // It disables loading of token icons, e.g. this URL: https://static.metafi.codefi.network/api/v1/tokenIcons/1337/0x0000000000000000000000000000000000000000.png
  const tokenIconRegex = new RegExp(
    `^https:\\/\\/static\\.metafi\\.codefi\\.network\\/api\\/vi\\/tokenIcons\\/${chainId}\\/.*\\.png`,
    'u',
  );
  nock(tokenIconRegex).persist().get().reply(200);

  nock('https://min-api.cryptocompare.com/data/price')
    .persist()
    .get()
    .query({ fsym: 'ETH', tsyms: 'USD' })
    .reply(200, {
      USD: '1700',
    });

  nock('https://customnetwork.com/api/customRPC').persist().post().reply(200, {
    jsonrpc: '2.0',
    id: '1675864782845',
    result: '0x122',
  });
}

export default setupMocking;
