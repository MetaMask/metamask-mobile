import ApproveTransactionModal from '.';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import { SET_APPROVAL_FOR_ALL_SIGNATURE } from '../../../../../util/transactions';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual('../../../../../selectors/smartTransactionsController'),
  selectShouldUseSmartTransaction: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
  context: {
    KeyringController: {
      getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const data = `0x${SET_APPROVAL_FOR_ALL_SIGNATURE}00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001`;
const transaction = {
  to: '0x',
  origin: 'test-dapp',
  chainId: '0x1',
  txParams: {
    to: '0x',
    from: '0x',
    data,
    origin: 'test-dapp',
  },
  data,
};

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  transaction,
  settings: {
    primaryCurrency: 'fiat',
  },
  browser: {
    activeTab: 1605778647042,
    tabs: [{ id: 1605778647042, url: 'https://metamask.github.io/test-dapp/' }],
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
        nativeTokenSupported: true,
      },
    ],
  },
};

describe('ApproveTransactionModal', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      ApproveTransactionModal,
      { name: 'Approve' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
