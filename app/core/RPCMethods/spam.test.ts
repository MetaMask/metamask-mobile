import configureMockStore from 'redux-mock-store';

import { NUMBER_OF_REJECTIONS_THRESHOLD } from '../redux/slices/originThrottling';
import initialBackgroundState from '../../util/test/initial-background-state.json';
import Routes from '../../constants/navigation/Routes';
import {
  BLOCKABLE_SPAM_RPC_METHODS,
  ExtendedJSONRPCRequest,
  processOriginThrottlingRejection,
  validateOriginThrottling,
} from './spam';

const [BLOCKABLE_RPC_METHOD_MOCK] = BLOCKABLE_SPAM_RPC_METHODS;
const SCAM_ORIGIN_MOCK = 'scam.origin';
const RPC_REQUEST_MOCK = {
  method: BLOCKABLE_RPC_METHOD_MOCK,
  origin: SCAM_ORIGIN_MOCK,
} as ExtendedJSONRPCRequest;
const NOT_BLOCKABLE_RPC_REQUEST_MOCK = {
  method: 'NOT_BLOCKABLE_REQUEST_METHOD',
} as ExtendedJSONRPCRequest;

const mockInitialState = {
  originThrottling: {
    origins: {},
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const mockStore = configureMockStore();

describe('utils', () => {
  describe('validateOriginThrottling', () => {
    describe('allows request', () => {
      it('when RPC request method is not blockable', () => {
        const store = mockStore(mockInitialState);
        expect(() =>
          validateOriginThrottling({
            req: NOT_BLOCKABLE_RPC_REQUEST_MOCK,
            store,
          }),
        ).not.toThrow();
      });

      it('when there is no active spam prompt and no past rejections', () => {
        const store = mockStore(mockInitialState);
        expect(() =>
          validateOriginThrottling({ req: RPC_REQUEST_MOCK, store }),
        ).not.toThrow();
      });

      it('when number of rejections is below the threshold', () => {
        const date30secAgo = Date.now() - 30000;

        const store = mockStore({
          ...mockInitialState,
          originThrottling: {
            origins: {
              [SCAM_ORIGIN_MOCK]: {
                rejections: NUMBER_OF_REJECTIONS_THRESHOLD - 1,
                lastRejection: date30secAgo,
              },
            },
          },
        });
        expect(() =>
          validateOriginThrottling({ req: RPC_REQUEST_MOCK, store }),
        ).not.toThrow();
      });

      it('when threshold is reached but more than a minute has passed', () => {
        const date2minAgo = Date.now() - 120000;

        const store = mockStore({
          ...mockInitialState,
          originThrottling: {
            origins: {
              [SCAM_ORIGIN_MOCK]: {
                rejections: NUMBER_OF_REJECTIONS_THRESHOLD,
                lastRejection: date2minAgo,
              },
            },
          },
        });
        expect(() =>
          validateOriginThrottling({ req: RPC_REQUEST_MOCK, store }),
        ).not.toThrow();
      });
    });

    describe('blocks request', () => {
      it('when origin has an active spam prompt', () => {
        const store = mockStore({
          ...mockInitialState,
          originThrottling: {
            origins: {
              [SCAM_ORIGIN_MOCK]: {
                rejections: 3,
                lastRejection: Date.now() - 1,
              },
            },
          },
        });
        expect(() =>
          validateOriginThrottling({ req: RPC_REQUEST_MOCK, store }),
        ).toThrow();
      });

      it('when dapp requests have been identified as spam within the past minute', () => {
        const date30secAgo = Date.now() - 30000;

        const store = mockStore({
          ...mockInitialState,
          originThrottling: {
            origins: {
              [SCAM_ORIGIN_MOCK]: {
                rejections: 3,
                lastRejection: date30secAgo,
              },
            },
          },
        });
        expect(() =>
          validateOriginThrottling({ req: RPC_REQUEST_MOCK, store }),
        ).toThrow();
      });
    });
  });

  describe('processOriginThrottlingRejection', () => {
    describe('does nothing', () => {
      it('when RPC request method is not blockable', () => {
        const store = mockStore(mockInitialState);
        expect(() =>
          processOriginThrottlingRejection({
            req: NOT_BLOCKABLE_RPC_REQUEST_MOCK,
            error: new Error('Some error'),
            store,
            navigation: {} as { navigate: jest.Mock },
          }),
        ).not.toThrow();
      });

      it('when error is not due to user rejection', () => {
        const store = mockStore(mockInitialState);
        const error = new Error('Some error');
        expect(() =>
          processOriginThrottlingRejection({
            req: RPC_REQUEST_MOCK,
            error,
            store,
            navigation: {} as { navigate: jest.Mock },
          }),
        ).not.toThrow();
      });
    });

    it('navigates to spam modal when spam prompt is active', () => {
      const store = mockStore({
        ...mockInitialState,
        originThrottling: {
          origins: {
            [SCAM_ORIGIN_MOCK]: {
              rejections: 3,
              lastRejection: Date.now() - 1,
            },
          },
        },
      });
      const navigation = { navigate: jest.fn() };
      const error = new Error('User rejected request');
      processOriginThrottlingRejection({
        req: RPC_REQUEST_MOCK,
        error,
        store,
        navigation,
      });

      expect(navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.DAPP_SPAM_MODAL,
          params: { origin: SCAM_ORIGIN_MOCK },
        },
      );
    });
  });
});
