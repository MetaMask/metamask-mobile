'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder, { DEFAULT_FIXTURE_ACCOUNT } from '../../fixtures/fixture-builder';
import TabBarComponent from '../../pages/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import Matchers from '../../utils/Matchers';

const RESPONSE_STANDARD_MOCK = {
    hash: '0x1',
    timestamp: new Date(123456789123).toISOString(),
    chainId: 1,
    blockNumber: 1,
    blockHash: '0x2',
    gas: 1,
    gasUsed: 1,
    gasPrice: '1',
    effectiveGasPrice: '1',
    nonce: 1,
    cumulativeGasUsed: 1,
    methodId: null,
    value: '1230000000000000000',
    to: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
    from: '0x2',
    isError: false,
    valueTransfers: [],
};

const RESPONSE_STANDARD_2_MOCK = {
    ...RESPONSE_STANDARD_MOCK,
    timestamp: new Date(987654321987).toISOString(),
    hash: '0x2',
    value: '2340000000000000000',
};

function mockAccountsApi() {
    return {
        urlEndpoint: `https://accounts.api.cx.metamask.io/v1/accounts/${DEFAULT_FIXTURE_ACCOUNT}/transactions?networks=0x1&sortDirection=ASC`,
        response: {
            data: [RESPONSE_STANDARD_MOCK, RESPONSE_STANDARD_2_MOCK],
            pageInfo: {
                count: 2,
                hasNextPage: false
            }
        },
        responseCode: 200,
    };
}

describe(SmokeCore('Incoming Transactions'), () => {
    beforeAll(async () => {
        jest.setTimeout(2500000);
        await TestHelpers.reverseServerPort();
        await startMockServer({ GET: [mockAccountsApi()] });
    });

    afterAll(async () => {
        try {
            await stopMockServer();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Mock server already stopped or encountered an error:', error);
        }
    });

    it('should display incoming transaction', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().build(),
                restartDevice: true
            },
            async () => {
                await loginToApp();
                await TabBarComponent.tapActivity();
                await ActivitiesView.swipeDown();
                await Assertions.checkIfTextIsDisplayed('Received ETH');
                await Assertions.checkIfTextIsDisplayed(/.*1\.23 ETH.*/);
                await Assertions.checkIfTextIsDisplayed(/.*2\.34 ETH.*/);
            }
        );
    });
});
