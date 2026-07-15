import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { mockTheme } from '../../../../../util/theme';
import createStyles from '../NetworkDetailsView.styles';
import { BUTTON_TEST_ID } from '../../../../../component-library/components-temp/ListItemMultiSelectButton/ListItemMultiSelectButton.constants';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import type { NetworkFormState } from '../NetworkDetailsView.types';
import type { UseNetworkFormReturn } from '../hooks/useNetworkForm';
import BlockExplorerSection, {
  BlockExplorerModals,
} from './BlockExplorerSection';

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
  rpcUrl: 'https://rpc.example.com',
  failoverRpcUrls: undefined,
  rpcName: 'RPC',
  rpcUrlForm: '',
  rpcNameForm: '',
  rpcUrls: [{ url: 'https://rpc.example.com', name: 'RPC', type: 'custom' }],
  blockExplorerUrls: ['https://scan1.example.com'],
  selectedRpcEndpointIndex: 0,
  blockExplorerUrl: 'https://scan1.example.com',
  blockExplorerUrlForm: 'https://new-scan.example.com',
  nickname: 'TestNet',
  chainId: '0x2a',
  ticker: 'TST',
  editable: true,
  addMode: false,
};

function createBlockExplorerModalFormHook(
  overrides: Partial<{
    form: Partial<NetworkFormState>;
    showMultiBlockExplorerAddModal: boolean;
    blockExplorerModalShowForm: boolean;
  }> = {},
): UseNetworkFormReturn {
  const form: NetworkFormState = {
    ...baseEditForm,
    ...overrides.form,
    blockExplorerUrls:
      overrides.form?.blockExplorerUrls ?? baseEditForm.blockExplorerUrls,
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
      showMultiRpcAddModal: false,
      rpcModalShowForm: false,
      showMultiBlockExplorerAddModal:
        overrides.showMultiBlockExplorerAddModal ?? true,
      blockExplorerModalShowForm: overrides.blockExplorerModalShowForm ?? true,
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

describe('BlockExplorerSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders block explorer text field in add mode', () => {
    const formHook = createBlockExplorerModalFormHook({
      form: {
        addMode: true,
        blockExplorerUrlForm: '',
        blockExplorerUrls: [],
        blockExplorerUrl: undefined,
      },
      showMultiBlockExplorerAddModal: false,
      blockExplorerModalShowForm: false,
    });

    const { getByTestId } = render(
      <BlockExplorerSection
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT),
    ).toBeOnTheScreen();
  });

  it('renders block explorer selector in edit mode', () => {
    const formHook = createBlockExplorerModalFormHook({
      showMultiBlockExplorerAddModal: false,
      blockExplorerModalShowForm: false,
    });

    const { getByTestId } = render(
      <BlockExplorerSection
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER),
    ).toBeOnTheScreen();
  });
});

describe('BlockExplorerModals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onBlockExplorerItemAdd when add submit runs and persist succeeds', async () => {
    const formHook = createBlockExplorerModalFormHook();
    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(true);

    const { getAllByTestId } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER)[0],
      );
    });

    await waitFor(() => {
      expect(onUrlSheetMutationCommitted).toHaveBeenCalled();
    });
    expect(onUrlSheetMutationCommitted).toHaveBeenCalledWith(
      expect.any(Object),
      { skipChainIdSubmitValidation: true },
    );
    expect(formHook.onBlockExplorerItemAdd).toHaveBeenCalledWith(
      'https://new-scan.example.com',
    );
  });

  it('shows sheet error and skips onBlockExplorerItemAdd when persist returns false', async () => {
    const formHook = createBlockExplorerModalFormHook();
    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(false);

    const { getAllByTestId, getByTestId } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER)[0],
      );
    });

    await waitFor(() => {
      expect(
        getByTestId(
          NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_SHEET_SUBMIT_ERROR,
        ),
      ).toHaveTextContent(
        strings('app_settings.url_sheet_network_update_failed'),
      );
    });
    expect(onUrlSheetMutationCommitted).toHaveBeenCalledWith(
      expect.any(Object),
      { skipChainIdSubmitValidation: true },
    );
    expect(formHook.onBlockExplorerItemAdd).not.toHaveBeenCalled();
  });

  it('calls onBlockExplorerItemAdd when onUrlSheetMutationCommitted is omitted', async () => {
    const formHook = createBlockExplorerModalFormHook();

    const { getAllByTestId } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
      />,
    );

    await act(async () => {
      fireEvent.press(
        getAllByTestId(NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER)[0],
      );
    });

    await waitFor(() => {
      expect(formHook.onBlockExplorerItemAdd).toHaveBeenCalledWith(
        'https://new-scan.example.com',
      );
    });
  });

  it('calls onBlockExplorerSelect after choosing an explorer URL when persist succeeds', async () => {
    const formHook = createBlockExplorerModalFormHook({
      form: {
        ...baseEditForm,
        blockExplorerUrls: [
          'https://scan1.example.com',
          'https://scan2.example.com',
        ],
        blockExplorerUrl: 'https://scan1.example.com',
      },
    });

    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(true);

    const { getByText } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('https://scan2.example.com'));
    });

    await waitFor(() => {
      expect(formHook.onBlockExplorerSelect).toHaveBeenCalledWith(
        'https://scan2.example.com',
      );
    });
    expect(onUrlSheetMutationCommitted).toHaveBeenCalledWith(
      expect.any(Object),
      { skipChainIdSubmitValidation: true },
    );
  });

  it('shows sheet error and skips onBlockExplorerSelect when persist returns false', async () => {
    const formHook = createBlockExplorerModalFormHook({
      form: {
        ...baseEditForm,
        blockExplorerUrls: [
          'https://scan1.example.com',
          'https://scan2.example.com',
        ],
        blockExplorerUrl: 'https://scan1.example.com',
      },
    });

    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(false);

    const { getByText, getByTestId } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('https://scan2.example.com'));
    });

    await waitFor(() => {
      expect(
        getByTestId(
          NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_SHEET_SUBMIT_ERROR,
        ),
      ).toBeOnTheScreen();
    });
    expect(onUrlSheetMutationCommitted).toHaveBeenCalledWith(
      expect.any(Object),
      { skipChainIdSubmitValidation: true },
    );
    expect(formHook.onBlockExplorerSelect).not.toHaveBeenCalled();
  });

  it('shows sheet error and skips onBlockExplorerUrlDelete when persist returns false', async () => {
    const formHook = createBlockExplorerModalFormHook({
      form: {
        ...baseEditForm,
        blockExplorerUrls: [
          'https://scan1.example.com',
          'https://scan2.example.com',
        ],
        blockExplorerUrl: 'https://scan1.example.com',
      },
    });

    const onUrlSheetMutationCommitted = jest.fn().mockResolvedValue(false);

    const { getAllByTestId, getByTestId } = render(
      <BlockExplorerModals
        formHook={formHook}
        styles={styles}
        themeAppearance="light"
        placeholderTextColor={placeholderTextColor}
        onUrlSheetMutationCommitted={onUrlSheetMutationCommitted}
      />,
    );

    await act(async () => {
      fireEvent.press(getAllByTestId(BUTTON_TEST_ID)[0]);
    });

    await waitFor(() => {
      expect(
        getByTestId(
          NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_SHEET_SUBMIT_ERROR,
        ),
      ).toBeOnTheScreen();
    });
    expect(onUrlSheetMutationCommitted).toHaveBeenCalledWith(
      expect.any(Object),
      { skipChainIdSubmitValidation: true },
    );
    expect(formHook.onBlockExplorerUrlDelete).not.toHaveBeenCalled();
  });
});
