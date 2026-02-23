import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { NetworkDetailsViewSelectorsIDs } from './NetworkDetailsView.testIds';
import NetworkDetailsView from './NetworkDetailsView';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: jest.fn(() => ({ params: undefined })),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: { removeNetwork: jest.fn() },
  },
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({ disableNetwork: jest.fn() }),
}));

const mockFormHook = jest.fn();
jest.mock('./hooks/useNetworkForm', () => ({
  useNetworkForm: (...args: unknown[]) => mockFormHook(...args),
}));

const mockValidation = jest.fn();
jest.mock('./hooks/useNetworkValidation', () => ({
  useNetworkValidation: () => mockValidation(),
}));

const mockOperations = jest.fn();
jest.mock('./hooks/useNetworkOperations', () => ({
  useNetworkOperations: () => mockOperations(),
}));

const createMockFormHook = (overrides = {}) => ({
  form: {
    rpcUrl: undefined,
    failoverRpcUrls: undefined,
    rpcName: undefined,
    rpcUrlForm: '',
    rpcNameForm: '',
    rpcUrls: [],
    blockExplorerUrls: [],
    selectedRpcEndpointIndex: 0,
    blockExplorerUrl: undefined,
    blockExplorerUrlForm: undefined,
    nickname: undefined,
    chainId: undefined,
    ticker: undefined,
    editable: undefined,
    addMode: true,
    ...overrides,
  },
  enableAction: false,
  focus: {
    isNameFieldFocused: false,
    isSymbolFieldFocused: false,
    isRpcUrlFieldFocused: false,
    isChainIdFieldFocused: false,
  },
  modals: {
    showMultiRpcAddModal: false,
    rpcModalShowForm: false,
    showMultiBlockExplorerAddModal: false,
    blockExplorerModalShowForm: false,
    showWarningModal: false,
  },
  isAnyModalVisible: false,
  inputRpcURL: { current: null },
  inputNameRpcURL: { current: null },
  inputChainId: { current: null },
  inputSymbol: { current: null },
  inputBlockExplorerURL: { current: null },
  onNicknameChange: jest.fn(),
  onChainIDChange: jest.fn(),
  onTickerChange: jest.fn(),
  autoFillNameField: jest.fn(),
  autoFillSymbolField: jest.fn(),
  onRpcUrlAdd: jest.fn(),
  onRpcNameAdd: jest.fn(),
  onRpcItemAdd: jest.fn(),
  onRpcUrlChangeWithName: jest.fn(),
  onRpcUrlDelete: jest.fn(),
  onBlockExplorerItemAdd: jest.fn(),
  onBlockExplorerUrlChange: jest.fn(),
  onBlockExplorerUrlDelete: jest.fn(),
  setValidationCallback: jest.fn(),
  onNameFocused: jest.fn(),
  onNameBlur: jest.fn(),
  onSymbolFocused: jest.fn(),
  onSymbolBlur: jest.fn(),
  onRpcUrlFocused: jest.fn(),
  onChainIdFocused: jest.fn(),
  onChainIdBlur: jest.fn(),
  jumpToRpcURL: jest.fn(),
  jumpToChainId: jest.fn(),
  jumpToSymbol: jest.fn(),
  jumpBlockExplorerURL: jest.fn(),
  openRpcModal: jest.fn(),
  closeRpcModal: jest.fn(),
  setRpcModalShowForm: jest.fn(),
  openBlockExplorerModal: jest.fn(),
  closeBlockExplorerModal: jest.fn(),
  setBlockExplorerModalShowForm: jest.fn(),
  toggleWarningModal: jest.fn(),
});

const createMockValidation = () => ({
  warningRpcUrl: undefined,
  warningChainId: undefined,
  warningSymbol: undefined,
  warningName: undefined,
  validatedRpcURL: true,
  validatedChainId: true,
  validatedSymbol: true,
  validateChainId: jest.fn(),
  validateChainIdOnSubmit: jest.fn().mockResolvedValue(true),
  validateSymbol: jest.fn(),
  validateName: jest.fn(),
  validateRpcAndChainId: jest.fn(),
  disabledByChainId: jest.fn(() => false),
  disabledBySymbol: jest.fn(() => false),
  checkIfChainIdExists: jest.fn(() => false),
  checkIfNetworkExists: jest.fn().mockResolvedValue([]),
  checkIfRpcUrlExists: jest.fn().mockResolvedValue([]),
  setWarningRpcUrl: jest.fn(),
  setWarningChainId: jest.fn(),
  onRpcUrlValidationChange: jest.fn(),
  networkList: null,
});

const createMockOperations = () => ({
  saveNetwork: jest.fn(),
  removeNetwork: jest.fn(),
  goToNetworkEdit: jest.fn(),
});

describe('NetworkDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormHook.mockReturnValue(createMockFormHook());
    mockValidation.mockReturnValue(createMockValidation());
    mockOperations.mockReturnValue(createMockOperations());
  });

  it('renders the container and save button in add mode', () => {
    const { getByTestId } = render(<NetworkDetailsView />);

    expect(getByTestId(NetworkDetailsViewSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON),
    ).toBeTruthy();
  });

  it('renders all form fields in add mode', () => {
    const { getByTestId } = render(<NetworkDetailsView />);

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORK_NAME_INPUT),
    ).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT),
    ).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
    ).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.CHAIN_INPUT),
    ).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORKS_SYMBOL_INPUT),
    ).toBeTruthy();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT),
    ).toBeTruthy();
  });

  it('shows add network title in header for add mode', () => {
    const { getByText } = render(<NetworkDetailsView />);

    expect(getByText(strings('app_settings.add_network_title'))).toBeTruthy();
  });

  it('calls onNicknameChange when name field text changes', () => {
    const formReturn = createMockFormHook();
    mockFormHook.mockReturnValue(formReturn);

    const { getByTestId } = render(<NetworkDetailsView />);

    fireEvent.changeText(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORK_NAME_INPUT),
      'My Network',
    );
    expect(formReturn.onNicknameChange).toHaveBeenCalledWith('My Network');
  });

  it('calls onChainIDChange when chain id field text changes', () => {
    const formReturn = createMockFormHook();
    mockFormHook.mockReturnValue(formReturn);

    const { getByTestId } = render(<NetworkDetailsView />);

    fireEvent.changeText(
      getByTestId(NetworkDetailsViewSelectorsIDs.CHAIN_INPUT),
      '137',
    );
    expect(formReturn.onChainIDChange).toHaveBeenCalledWith('137');
  });

  it('calls onTickerChange when symbol field text changes', () => {
    const formReturn = createMockFormHook();
    mockFormHook.mockReturnValue(formReturn);

    const { getByTestId } = render(<NetworkDetailsView />);

    fireEvent.changeText(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORKS_SYMBOL_INPUT),
      'MATIC',
    );
    expect(formReturn.onTickerChange).toHaveBeenCalledWith('MATIC');
  });

  it('renders "Use this network" button when isCustomMainnet param is set', () => {
    const { useRoute } = jest.requireMock('@react-navigation/native');
    useRoute.mockReturnValue({ params: { isCustomMainnet: true } });

    const { getByTestId } = render(<NetworkDetailsView />);

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.USE_THIS_NETWORK_BUTTON),
    ).toBeTruthy();
  });

  describe('edit mode', () => {
    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://mainnet.infura.io/v3/key' },
      });

      mockFormHook.mockReturnValue(
        createMockFormHook({
          addMode: false,
          nickname: 'Ethereum Mainnet',
          chainId: '0x1',
          ticker: 'ETH',
          rpcUrl: 'https://mainnet.infura.io/v3/key',
          rpcName: 'Infura',
          rpcUrls: [
            {
              url: 'https://mainnet.infura.io/v3/key',
              name: 'Infura',
              type: 'infura',
            },
          ],
          blockExplorerUrl: 'https://etherscan.io',
          blockExplorerUrls: ['https://etherscan.io'],
          editable: true,
        }),
      );
    });

    it('renders network name in header', () => {
      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('renders RPC dropdown selector instead of inline input', () => {
      const { getByTestId, queryByTestId } = render(<NetworkDetailsView />);

      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_RPC),
      ).toBeTruthy();
      expect(
        queryByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
      ).toBeNull();
    });

    it('renders block explorer dropdown selector', () => {
      const { getByTestId } = render(<NetworkDetailsView />);

      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER),
      ).toBeTruthy();
    });

    it('disables chain ID field in edit mode', () => {
      const { getByTestId } = render(<NetworkDetailsView />);

      const chainInput = getByTestId(
        NetworkDetailsViewSelectorsIDs.CHAIN_INPUT,
      );
      expect(chainInput.props.editable).toBe(false);
    });

    it('shows RPC warning banner when warningRpcUrl is set', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningRpcUrl: 'Invalid RPC URL',
      });

      const { getByTestId } = render(<NetworkDetailsView />);

      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER),
      ).toBeTruthy();
    });

    it('shows failover tag when failover RPC URLs exist and flag is enabled', () => {
      jest.requireMock('react-redux').useSelector.mockReturnValue(true);

      mockFormHook.mockReturnValue(
        createMockFormHook({
          addMode: false,
          nickname: 'Polygon',
          chainId: '0x89',
          ticker: 'MATIC',
          rpcUrl: 'https://polygon-rpc.com',
          rpcName: 'Polygon RPC',
          failoverRpcUrls: ['https://failover.polygon.com'],
          rpcUrls: [
            {
              url: 'https://polygon-rpc.com',
              name: 'Polygon RPC',
              type: 'custom',
            },
          ],
          blockExplorerUrl: 'https://polygonscan.com',
          blockExplorerUrls: ['https://polygonscan.com'],
          editable: true,
        }),
      );

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText(strings('app_settings.failover'))).toBeTruthy();
    });
  });

  describe('validation warnings', () => {
    it('shows chain ID warning text', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningChainId: 'Invalid chain ID',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('Invalid chain ID')).toBeTruthy();
    });

    it('shows symbol warning with suggested ticker', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningSymbol: 'MATIC',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('MATIC')).toBeTruthy();
      expect(
        getByText(strings('wallet.suggested_token_symbol'), { exact: false }),
      ).toBeTruthy();
    });

    it('shows name warning with suggested name', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningName: 'Polygon Mainnet',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('Polygon Mainnet')).toBeTruthy();
      expect(
        getByText(strings('wallet.suggested_name'), { exact: false }),
      ).toBeTruthy();
    });
  });

  it('disables save button when validation disables chain ID', () => {
    mockValidation.mockReturnValue({
      ...createMockValidation(),
      disabledByChainId: jest.fn(() => true),
    });

    const { getByTestId } = render(<NetworkDetailsView />);

    const saveButton = getByTestId(
      NetworkDetailsViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON,
    );
    expect(saveButton.props.disabled).toBe(true);
  });

  it('shows warning modal when showWarningModal is true', () => {
    mockFormHook.mockReturnValue({
      ...createMockFormHook(),
      modals: {
        showMultiRpcAddModal: false,
        rpcModalShowForm: false,
        showMultiBlockExplorerAddModal: false,
        blockExplorerModalShowForm: false,
        showWarningModal: true,
      },
    });

    const { getByText } = render(<NetworkDetailsView />);

    expect(getByText(strings('networks.network_warning_title'))).toBeTruthy();
  });
});
