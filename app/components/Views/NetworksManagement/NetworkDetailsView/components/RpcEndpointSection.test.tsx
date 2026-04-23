import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { RpcEndpointType } from '@metamask/network-controller';
import { BUTTON_TEST_ID } from '../../../../../component-library/components-temp/ListItemMultiSelectButton/ListItemMultiSelectButton.constants';
import { mockTheme } from '../../../../../util/theme';
import createStyles from '../NetworkDetailsView.styles';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import type { UseNetworkFormReturn } from '../hooks/useNetworkForm';
import type { UseNetworkValidationReturn } from '../hooks/useNetworkValidation';
import RpcEndpointSection, { RpcEndpointModals } from './RpcEndpointSection';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const Rn = jest.requireActual('react-native');
    const R = jest.requireActual('react');
    return {
      __esModule: true,
      default: R.forwardRef(
        (
          { children }: { children: React.ReactNode },
          _ref: React.Ref<unknown>,
        ) => <Rn.View>{children}</Rn.View>,
      ),
      BottomSheetRef: {},
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
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

const styles = createStyles({ theme: mockTheme });
const placeholderTextColor = mockTheme.colors.text.muted;

const baseEditForm: NetworkFormState = {
  rpcUrl: 'https://rpc1.example.com',
  failoverRpcUrls: undefined,
  rpcName: 'RPC One',
  rpcUrlForm: 'https://new-rpc.example.com',
  rpcNameForm: 'New RPC',
  rpcUrls: [
    {
      url: 'https://rpc1.example.com',
      name: 'RPC One',
      type: RpcEndpointType.Custom,
    },
  ],
  blockExplorerUrls: [],
  selectedRpcEndpointIndex: 0,
  blockExplorerUrl: undefined,
  blockExplorerUrlForm: undefined,
  nickname: 'TestNet',
  chainId: '0x2a',
  ticker: 'TST',
  editable: true,
  addMode: false,
};

function createRpcModalFormHook(
  overrides: Partial<{
    form: Partial<NetworkFormState>;
    showMultiRpcAddModal: boolean;
    rpcModalShowForm: boolean;
  }> = {},
): UseNetworkFormReturn {
  const form: NetworkFormState = {
    ...baseEditForm,
    ...overrides.form,
    rpcUrls: overrides.form?.rpcUrls ?? baseEditForm.rpcUrls,
  };

  return {
    form,
    enableAction: false,
    focus: {
      isNameFieldFocused: false,
      isSymbolFieldFocused: false,
      isRpcUrlFieldFocused: false,
      isChainIdFieldFocused: false,
    },
    modals: {
      showMultiRpcAddModal: overrides.showMultiRpcAddModal ?? true,
      rpcModalShowForm: overrides.rpcModalShowForm ?? true,
      showMultiBlockExplorerAddModal: false,
      blockExplorerModalShowForm: false,
      showWarningModal: false,
    },
    isAnyModalVisible: true,
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
    commitBaselineFromFormState: jest.fn(),
    onNameFocused: jest.fn(),
    onNameBlur: jest.fn(),
    onSymbolFocused: jest.fn(),
    onSymbolBlur: jest.fn(),
    onRpcUrlFocused: jest.fn(),
    onRpcUrlBlur: jest.fn(),
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
  } as UseNetworkFormReturn;
}

function createRpcValidation(
  overrides: Partial<{
    validateNewRpcEndpointForSheet: UseNetworkValidationReturn['validateNewRpcEndpointForSheet'];
    validatedRpcURL: boolean;
    warningRpcUrl: string | undefined;
  }> = {},
): UseNetworkValidationReturn {
  return {
    warningRpcUrl: overrides.warningRpcUrl,
    warningChainId: undefined,
    warningSymbol: undefined,
    warningName: undefined,
    validatedRpcURL: overrides.validatedRpcURL ?? true,
    validatedChainId: true,
    validatedSymbol: true,
    validateChainId: jest.fn(),
    validateChainIdOnSubmit: jest.fn().mockResolvedValue(true),
    validateSymbol: jest.fn(),
    validateName: jest.fn(),
    validateRpcAndChainId: jest.fn(),
    validateNewRpcEndpointForSheet:
      overrides.validateNewRpcEndpointForSheet ??
      jest.fn().mockResolvedValue({ ok: true }),
    disabledByChainId: jest.fn(() => false),
    disabledByName: jest.fn(() => false),
    disabledBySymbol: jest.fn(() => false),
    checkIfChainIdExists: jest.fn(() => false),
    checkIfNetworkExists: jest.fn().mockResolvedValue([]),
    checkIfRpcUrlExists: jest.fn().mockResolvedValue([]),
    setWarningRpcUrl: jest.fn(),
    setWarningChainId: jest.fn(),
    onRpcUrlValidationChange: jest.fn(),
    networkList: null,
  } as UseNetworkValidationReturn;
}

describe('RpcEndpointSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders inline RPC form fields in add mode', () => {
    const formHook = createRpcModalFormHook({
      form: { addMode: true, rpcUrlForm: '', rpcNameForm: '', rpcUrls: [] },
      showMultiRpcAddModal: false,
      rpcModalShowForm: false,
    });

    const { getByTestId } = render(
      <RpcEndpointSection
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT),
    ).toBeOnTheScreen();
  });

  it('renders RPC selector in edit mode', () => {
    const formHook = createRpcModalFormHook({
      showMultiRpcAddModal: false,
      rpcModalShowForm: false,
    });

    const { getByTestId } = render(
      <RpcEndpointSection
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_RPC),
    ).toBeOnTheScreen();
  });
});

describe('RpcEndpointModals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onRpcItemAdd after sheet validation when persist succeeds', async () => {
    const validateNewRpcEndpointForSheet = jest
      .fn()
      .mockResolvedValue({ ok: true });
    const formHook = createRpcModalFormHook();
    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(true);

    const { getAllByTestId } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation({ validateNewRpcEndpointForSheet })}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    const addButtons = getAllByTestId(
      NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON,
    );

    await act(async () => {
      fireEvent.press(addButtons[0]);
    });

    await waitFor(() => {
      expect(validateNewRpcEndpointForSheet).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onUrlSheetMutationCommitted).toHaveBeenCalled();
    });
    expect(formHook.onRpcItemAdd).toHaveBeenCalledWith(
      'https://new-rpc.example.com',
      'New RPC',
    );
  });

  it('shows RPC sheet error and skips onRpcItemAdd when persist returns false', async () => {
    const formHook = createRpcModalFormHook();
    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(false);

    const { getAllByTestId, getByTestId } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON)[0],
      );
    });

    await waitFor(() => {
      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_SHEET_SUBMIT_ERROR),
      ).toHaveTextContent(
        strings('app_settings.rpc_sheet_network_update_failed'),
      );
    });
    expect(formHook.onRpcItemAdd).not.toHaveBeenCalled();
  });

  it('shows validation message and skips persist when sheet validation fails', async () => {
    const formHook = createRpcModalFormHook();
    const onUrlSheetMutationCommitted = jest.fn();
    const validateNewRpcEndpointForSheet = jest.fn().mockResolvedValue({
      ok: false,
      message: 'Sheet validation failed',
    });

    const { getAllByTestId, getByText } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation({ validateNewRpcEndpointForSheet })}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON)[0],
      );
    });

    await waitFor(() => {
      expect(getByText('Sheet validation failed')).toBeOnTheScreen();
    });
    expect(onUrlSheetMutationCommitted).not.toHaveBeenCalled();
    expect(formHook.onRpcItemAdd).not.toHaveBeenCalled();
  });

  it('calls onRpcItemAdd when onUrlSheetMutationCommitted is omitted', async () => {
    const formHook = createRpcModalFormHook();

    const { getAllByTestId } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON)[0],
      );
    });

    await waitFor(() => {
      expect(formHook.onRpcItemAdd).toHaveBeenCalledWith(
        'https://new-rpc.example.com',
        'New RPC',
      );
    });
  });

  it('calls onRpcUrlChangeWithName after selecting another RPC when persist succeeds', async () => {
    const formHook = createRpcModalFormHook({
      form: {
        rpcUrl: 'https://rpc1.example.com',
        rpcUrls: [
          {
            url: 'https://rpc1.example.com',
            name: 'RPC One',
            type: RpcEndpointType.Custom,
          },
          {
            url: 'https://rpc2.example.com',
            name: 'RPC Two',
            type: RpcEndpointType.Custom,
          },
        ],
      },
    });

    const { getByText } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={jest.fn().mockResolvedValue(true)}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('RPC Two'));
    });

    await waitFor(() => {
      expect(formHook.onRpcUrlChangeWithName).toHaveBeenCalledWith(
        'https://rpc2.example.com',
        undefined,
        'RPC Two',
        RpcEndpointType.Custom,
      );
    });
  });

  it('shows sheet error and skips onRpcUrlChangeWithName when persist returns false', async () => {
    const formHook = createRpcModalFormHook({
      form: {
        rpcUrl: 'https://rpc1.example.com',
        rpcUrls: [
          {
            url: 'https://rpc1.example.com',
            name: 'RPC One',
            type: RpcEndpointType.Custom,
          },
          {
            url: 'https://rpc2.example.com',
            name: 'RPC Two',
            type: RpcEndpointType.Custom,
          },
        ],
      },
    });

    const { getByText, getByTestId } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={jest.fn().mockResolvedValue(false)}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('RPC Two'));
    });

    await waitFor(() => {
      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_SHEET_SUBMIT_ERROR),
      ).toHaveTextContent(
        strings('app_settings.url_sheet_network_update_failed'),
      );
    });
    expect(formHook.onRpcUrlChangeWithName).not.toHaveBeenCalled();
  });

  it('shows sheet error and skips onRpcUrlDelete when persist returns false', async () => {
    const formHook = createRpcModalFormHook({
      form: {
        rpcUrl: 'https://rpc1.example.com',
        rpcUrls: [
          {
            url: 'https://rpc1.example.com',
            name: 'RPC One',
            type: RpcEndpointType.Custom,
          },
          {
            url: 'https://rpc2.example.com',
            name: 'RPC Two',
            type: RpcEndpointType.Custom,
          },
        ],
      },
    });

    const { getAllByTestId, getByTestId } = render(
      <RpcEndpointModals
        formHook={formHook}
        validation={createRpcValidation()}
        onValidationSuccess={jest.fn()}
        isRpcFailoverEnabled={false}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={jest.fn().mockResolvedValue(false)}
      />,
    );

    await act(async () => {
      fireEvent.press(getAllByTestId(BUTTON_TEST_ID)[0]);
    });

    await waitFor(() => {
      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_SHEET_SUBMIT_ERROR),
      ).toBeOnTheScreen();
    });
    expect(formHook.onRpcUrlDelete).not.toHaveBeenCalled();
  });
});
