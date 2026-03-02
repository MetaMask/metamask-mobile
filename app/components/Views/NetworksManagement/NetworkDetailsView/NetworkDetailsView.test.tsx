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

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const Rn = jest.requireActual('react-native');
    const R = jest.requireActual('react');
    const Sheet = R.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose?: () => void },
        _ref: React.Ref<unknown>,
      ) => (
        <Rn.View>
          {children}
          {onClose && <Rn.Text onPress={onClose}>CloseSheet</Rn.Text>}
        </Rn.View>
      ),
    );
    return { __esModule: true, default: Sheet, BottomSheetRef: {} };
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const Rn = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <Rn.Text>{children}</Rn.Text>
      ),
    };
  },
);

const createMockFormHook = (overrides: Record<string, unknown> = {}) => ({
  form: {
    rpcUrl: undefined as string | undefined,
    failoverRpcUrls: undefined as string[] | undefined,
    rpcName: undefined as string | undefined,
    rpcUrlForm: '',
    rpcNameForm: '',
    rpcUrls: [] as { url: string; name: string; type: string }[],
    blockExplorerUrls: [] as string[],
    selectedRpcEndpointIndex: 0,
    blockExplorerUrl: undefined as string | undefined,
    blockExplorerUrlForm: undefined as string | undefined,
    nickname: undefined as string | undefined,
    chainId: undefined as string | undefined,
    ticker: undefined as string | undefined,
    editable: undefined as boolean | undefined,
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
  onBlockExplorerSelect: jest.fn(),
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

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders all form fields in add mode', () => {
    const { getByTestId } = render(<NetworkDetailsView />);

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORK_NAME_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.CHAIN_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.NETWORKS_SYMBOL_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT),
    ).toBeOnTheScreen();
  });

  it('shows add network title in header for add mode', () => {
    const { getByText } = render(<NetworkDetailsView />);

    expect(
      getByText(strings('app_settings.add_network_title')),
    ).toBeOnTheScreen();
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
    ).toBeOnTheScreen();
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

      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('renders RPC dropdown selector instead of inline input', () => {
      const { getByTestId, queryByTestId } = render(<NetworkDetailsView />);

      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_RPC),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
      ).toBeNull();
    });

    it('renders block explorer dropdown selector', () => {
      const { getByTestId } = render(<NetworkDetailsView />);

      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER),
      ).toBeOnTheScreen();
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
      ).toBeOnTheScreen();
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

      expect(getByText(strings('app_settings.failover'))).toBeOnTheScreen();
    });
  });

  describe('validation warnings', () => {
    it('shows chain ID warning text', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningChainId: 'Invalid chain ID',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('Invalid chain ID')).toBeOnTheScreen();
    });

    it('shows symbol warning with suggested ticker', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningSymbol: 'MATIC',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('MATIC')).toBeOnTheScreen();
      expect(
        getByText(strings('wallet.suggested_token_symbol'), { exact: false }),
      ).toBeOnTheScreen();
    });

    it('shows name warning with suggested name', () => {
      mockValidation.mockReturnValue({
        ...createMockValidation(),
        warningName: 'Polygon Mainnet',
      });

      const { getByText } = render(<NetworkDetailsView />);

      expect(getByText('Polygon Mainnet')).toBeOnTheScreen();
      expect(
        getByText(strings('wallet.suggested_name'), { exact: false }),
      ).toBeOnTheScreen();
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

    expect(
      getByText(strings('networks.network_warning_title')),
    ).toBeOnTheScreen();
  });

  it('calls saveNetwork when save button is pressed', () => {
    const ops = createMockOperations();
    mockOperations.mockReturnValue(ops);
    mockFormHook.mockReturnValue({
      ...createMockFormHook({ chainId: '42', ticker: 'TST' }),
      enableAction: true,
    });

    const { getByTestId } = render(<NetworkDetailsView />);

    fireEvent.press(
      getByTestId(NetworkDetailsViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON),
    );
    expect(ops.saveNetwork).toHaveBeenCalled();
  });

  describe('RPC modal open in edit mode', () => {
    const editFormWithRpcModal = () => {
      const form = createMockFormHook({
        addMode: false,
        nickname: 'TestNet',
        chainId: '0x2a',
        ticker: 'TST',
        rpcUrl: 'https://rpc1.example.com',
        rpcName: 'RPC One',
        rpcUrls: [
          { url: 'https://rpc1.example.com', name: 'RPC One', type: 'custom' },
          { url: 'https://rpc2.example.com', name: 'RPC Two', type: 'custom' },
        ],
        blockExplorerUrl: 'https://scan.example.com',
        blockExplorerUrls: ['https://scan.example.com'],
        editable: true,
      });
      form.modals = {
        ...form.modals,
        showMultiRpcAddModal: true,
        rpcModalShowForm: true,
      };
      return form;
    };

    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc1.example.com' },
      });
    });

    it('renders RPC list items inside the modal', () => {
      mockFormHook.mockReturnValue(editFormWithRpcModal());

      const { getAllByText } = render(<NetworkDetailsView />);

      expect(
        getAllByText(strings('app_settings.add_rpc_url')).length,
      ).toBeGreaterThanOrEqual(1);
      expect(getAllByText('RPC One').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('RPC Two').length).toBeGreaterThanOrEqual(1);
    });

    it('renders RPC URL and name inputs inside modal form', () => {
      mockFormHook.mockReturnValue(editFormWithRpcModal());

      const { getAllByTestId } = render(<NetworkDetailsView />);

      const rpcInputs = getAllByTestId(
        NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT,
      );
      expect(rpcInputs.length).toBeGreaterThanOrEqual(1);

      const addButton = getAllByTestId(
        NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON,
      );
      expect(addButton.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Block explorer modal open in edit mode', () => {
    const editFormWithBlockExplorerModal = () => {
      const form = createMockFormHook({
        addMode: false,
        nickname: 'TestNet',
        chainId: '0x2a',
        ticker: 'TST',
        rpcUrl: 'https://rpc.example.com',
        rpcName: 'RPC',
        rpcUrls: [
          { url: 'https://rpc.example.com', name: 'RPC', type: 'custom' },
        ],
        blockExplorerUrl: 'https://scan1.example.com',
        blockExplorerUrlForm: '',
        blockExplorerUrls: [
          'https://scan1.example.com',
          'https://scan2.example.com',
        ],
        editable: true,
      });
      form.modals = {
        ...form.modals,
        showMultiBlockExplorerAddModal: true,
        blockExplorerModalShowForm: true,
      };
      return form;
    };

    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc.example.com' },
      });
    });

    it('renders block explorer list items inside the modal', () => {
      mockFormHook.mockReturnValue(editFormWithBlockExplorerModal());

      const { getAllByText } = render(<NetworkDetailsView />);

      expect(
        getAllByText(strings('app_settings.add_block_explorer_url')).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        getAllByText('https://scan1.example.com').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        getAllByText('https://scan2.example.com').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders block explorer form input inside modal', () => {
      mockFormHook.mockReturnValue(editFormWithBlockExplorerModal());

      const { getAllByTestId } = render(<NetworkDetailsView />);

      const inputs = getAllByTestId(
        NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT,
      );
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('failover RPC display in edit mode', () => {
    it('renders failover RPC URL as read-only field', () => {
      jest.requireMock('react-redux').useSelector.mockReturnValue(true);
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc.example.com' },
      });

      mockFormHook.mockReturnValue(
        createMockFormHook({
          addMode: false,
          nickname: 'TestNet',
          chainId: '0x2a',
          ticker: 'TST',
          rpcUrl: 'https://rpc.example.com',
          rpcName: 'RPC',
          failoverRpcUrls: ['https://failover.example.com'],
          rpcUrls: [
            { url: 'https://rpc.example.com', name: 'RPC', type: 'custom' },
          ],
          blockExplorerUrl: 'https://scan.example.com',
          blockExplorerUrls: ['https://scan.example.com'],
          editable: true,
        }),
      );

      const { getByText } = render(<NetworkDetailsView />);

      expect(
        getByText(strings('app_settings.network_failover_rpc_url_label')),
      ).toBeOnTheScreen();
    });
  });

  describe('validation callback wiring', () => {
    it('invokes validation via setValidationCallback in add mode', () => {
      const formReturn = createMockFormHook({ addMode: true });
      let capturedCb: (() => void) | undefined;
      formReturn.setValidationCallback = jest.fn((cb: () => void) => {
        capturedCb = cb;
      });
      mockFormHook.mockReturnValue(formReturn);
      const val = createMockValidation();
      mockValidation.mockReturnValue(val);

      render(<NetworkDetailsView />);

      expect(capturedCb).toBeDefined();
      if (capturedCb) capturedCb();
      expect(val.validateChainId).toHaveBeenCalled();
      expect(val.validateName).toHaveBeenCalled();
      expect(val.validateSymbol).toHaveBeenCalled();
    });

    it('triggers handleValidateChainId on chain ID field blur', () => {
      const val = createMockValidation();
      mockValidation.mockReturnValue(val);

      const { getByTestId } = render(<NetworkDetailsView />);

      fireEvent(
        getByTestId(NetworkDetailsViewSelectorsIDs.CHAIN_INPUT),
        'blur',
      );
      expect(val.validateChainId).toHaveBeenCalled();
    });

    it('triggers handleValidateName on name field blur', () => {
      const val = createMockValidation();
      mockValidation.mockReturnValue(val);

      const { getByTestId } = render(<NetworkDetailsView />);

      fireEvent(
        getByTestId(NetworkDetailsViewSelectorsIDs.NETWORK_NAME_INPUT),
        'blur',
      );
      expect(val.validateName).toHaveBeenCalled();
    });

    it('triggers handleValidateSymbol on symbol field blur', () => {
      const val = createMockValidation();
      mockValidation.mockReturnValue(val);

      const { getByTestId } = render(<NetworkDetailsView />);

      fireEvent(
        getByTestId(NetworkDetailsViewSelectorsIDs.NETWORKS_SYMBOL_INPUT),
        'blur',
      );
      expect(val.validateSymbol).toHaveBeenCalled();
    });
  });

  describe('delete flow in edit mode', () => {
    const editForm = () =>
      createMockFormHook({
        addMode: false,
        nickname: 'TestNet',
        chainId: '0x2a',
        ticker: 'TST',
        rpcUrl: 'https://rpc.example.com',
        rpcName: 'RPC',
        rpcUrls: [
          { url: 'https://rpc.example.com', name: 'RPC', type: 'custom' },
        ],
        blockExplorerUrl: 'https://scan.example.com',
        blockExplorerUrls: ['https://scan.example.com'],
        editable: true,
      });

    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc.example.com' },
      });
    });

    it('shows delete modal when trash icon is pressed', () => {
      mockFormHook.mockReturnValue(editForm());

      const { getByTestId, queryByText, getByText } = render(
        <NetworkDetailsView />,
      );

      expect(queryByText(strings('app_settings.network_delete'))).toBeNull();

      const trashIcon = getByTestId(
        NetworkDetailsViewSelectorsIDs.CONTAINER,
      ).findAllByProps({ name: 'Trash' })[0];

      if (trashIcon.parent) fireEvent.press(trashIcon.parent);

      expect(
        getByText(strings('app_settings.network_delete')),
      ).toBeOnTheScreen();
    });

    it('calls operations.removeNetwork on confirm delete', () => {
      const ops = createMockOperations();
      mockOperations.mockReturnValue(ops);
      mockFormHook.mockReturnValue(editForm());

      const { getByTestId } = render(<NetworkDetailsView />);

      // Open delete modal
      const container = getByTestId(NetworkDetailsViewSelectorsIDs.CONTAINER);
      const trashIcon = container.findAllByProps({ name: 'Trash' })[0];
      if (trashIcon.parent) fireEvent.press(trashIcon.parent);

      // Confirm delete
      fireEvent.press(getByTestId('networks-settings-delete-confirm-button'));

      expect(ops.removeNetwork).toHaveBeenCalledWith('0x2a');
    });
  });

  describe('RPC modal interactions', () => {
    const editFormWithRpcModal2 = () => {
      const form = createMockFormHook({
        addMode: false,
        nickname: 'TestNet',
        chainId: '0x2a',
        ticker: 'TST',
        rpcUrl: 'https://rpc1.example.com',
        rpcName: 'RPC One',
        rpcUrlForm: 'https://new-rpc.example.com',
        rpcNameForm: 'New RPC',
        rpcUrls: [
          { url: 'https://rpc1.example.com', name: 'RPC One', type: 'custom' },
        ],
        blockExplorerUrl: 'https://scan.example.com',
        blockExplorerUrls: ['https://scan.example.com'],
        editable: true,
      });
      form.modals = {
        ...form.modals,
        showMultiRpcAddModal: true,
        rpcModalShowForm: true,
      };
      return form;
    };

    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc1.example.com' },
      });
    });

    it('calls onRpcItemAdd when add RPC button is pressed in modal', () => {
      const form = editFormWithRpcModal2();
      mockFormHook.mockReturnValue(form);

      const { getAllByTestId } = render(<NetworkDetailsView />);

      const addButtons = getAllByTestId(
        NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON,
      );
      fireEvent.press(addButtons[0]);
      expect(form.onRpcItemAdd).toHaveBeenCalledWith(
        'https://new-rpc.example.com',
        'New RPC',
      );
    });
  });

  describe('Block explorer modal interactions', () => {
    const editFormWithBlockExplorerModal2 = () => {
      const form = createMockFormHook({
        addMode: false,
        nickname: 'TestNet',
        chainId: '0x2a',
        ticker: 'TST',
        rpcUrl: 'https://rpc.example.com',
        rpcName: 'RPC',
        rpcUrls: [
          { url: 'https://rpc.example.com', name: 'RPC', type: 'custom' },
        ],
        blockExplorerUrl: 'https://scan1.example.com',
        blockExplorerUrlForm: 'https://new-scan.example.com',
        blockExplorerUrls: ['https://scan1.example.com'],
        editable: true,
      });
      form.modals = {
        ...form.modals,
        showMultiBlockExplorerAddModal: true,
        blockExplorerModalShowForm: true,
      };
      return form;
    };

    beforeEach(() => {
      const { useRoute } = jest.requireMock('@react-navigation/native');
      useRoute.mockReturnValue({
        params: { network: 'https://rpc.example.com' },
      });
    });

    it('calls onBlockExplorerItemAdd when add button is pressed in modal', () => {
      const form = editFormWithBlockExplorerModal2();
      mockFormHook.mockReturnValue(form);

      const { getAllByTestId } = render(<NetworkDetailsView />);

      const addButtons = getAllByTestId(
        NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER,
      );
      fireEvent.press(addButtons[0]);
      expect(form.onBlockExplorerItemAdd).toHaveBeenCalledWith(
        'https://new-scan.example.com',
      );
    });
  });
});
