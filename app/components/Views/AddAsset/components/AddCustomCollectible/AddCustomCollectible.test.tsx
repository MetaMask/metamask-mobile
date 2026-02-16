import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import AddCustomCollectible from './AddCustomCollectible';
import Engine from '../../../../../core/Engine';
// eslint-disable-next-line import/no-namespace
import * as utilsTransactions from '../../../../../util/transactions';

// --- Mock variables (hoisted by Jest) ---

const mockShowToast = jest.fn();

// --- Module mocks ---

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NftController: {
      addNft: jest.fn(),
      isNftOwner: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
  })),
}));

jest.mock('../../../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  const MockToastContext = actualReact.createContext({});
  return {
    ...jest.requireActual('../../../../../component-library/components/Toast'),
    ToastContext: MockToastContext,
    ToastVariants: { Plain: 'Plain' },
  };
});

// --- Helpers ---

const ToastWrapper = ({ children }: { children: React.ReactNode }) => {
  const {
    ToastContext,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('../../../../../component-library/components/Toast');
  return (
    <ToastContext.Provider
      value={{ toastRef: { current: { showToast: mockShowToast } } }}
    >
      {children}
    </ToastContext.Provider>
  );
};

const VALID_ADDRESS = '0x1a92f7381b9f03921564a437210bb9396471050c';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const renderComponent = (
  overrides: {
    navigation?: Record<string, jest.Mock>;
    selectedNetwork?: string | null;
    networkClientId?: string | null;
    collectibleContract?: { address: string };
    withToast?: boolean;
  } = {},
) => {
  const component = (
    <AddCustomCollectible
      navigation={overrides.navigation}
      selectedNetwork={
        'selectedNetwork' in overrides
          ? (overrides.selectedNetwork as string | null)
          : 'Ethereum Mainnet'
      }
      networkClientId={overrides.networkClientId ?? 'mainnet'}
      collectibleContract={overrides.collectibleContract}
    />
  );

  return renderWithProvider(
    overrides.withToast ? <ToastWrapper>{component}</ToastWrapper> : component,
    { state: mockInitialState },
  );
};

const fillForm = (
  utils: ReturnType<typeof renderComponent>,
  address = VALID_ADDRESS,
  tokenId = '55',
) => {
  fireEvent.changeText(utils.getByTestId('input-collectible-address'), address);
  fireEvent.changeText(
    utils.getByTestId('input-collectible-identifier'),
    tokenId,
  );
};

// --- Tests ---

describe('AddCustomCollectible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.NftController.addNft as jest.Mock).mockResolvedValue(
      undefined,
    );
    (Engine.context.NftController.isNftOwner as jest.Mock).mockResolvedValue(
      true,
    );
    jest
      .spyOn(utilsTransactions, 'isSmartContractAddress')
      .mockResolvedValue(true);
  });

  it('adds NFT and navigates back on successful submission', async () => {
    const mockGoBack = jest.fn();

    const utils = renderComponent({
      navigation: { navigate: jest.fn(), goBack: mockGoBack },
    });

    fillForm(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('add-collectible-button'));
    });

    expect(Engine.context.NftController.addNft).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('address validation', () => {
    it('shows error when address is empty on blur', async () => {
      const { getByTestId } = renderComponent();

      fireEvent(getByTestId('input-collectible-address'), 'onBlur');

      await waitFor(() => {
        expect(getByTestId('collectible-address-warning').props.children).toBe(
          'collectible.address_cant_be_empty',
        );
      });
    });

    it('shows error when address is invalid on blur', async () => {
      const { getByTestId } = renderComponent();

      fireEvent.changeText(
        getByTestId('input-collectible-address'),
        'invalid-address',
      );
      fireEvent(getByTestId('input-collectible-address'), 'onBlur');

      await waitFor(() => {
        expect(getByTestId('collectible-address-warning').props.children).toBe(
          'collectible.address_must_be_valid',
        );
      });
    });

    it('shows error when address is not a smart contract on blur', async () => {
      jest
        .spyOn(utilsTransactions, 'isSmartContractAddress')
        .mockResolvedValue(false);

      const { getByTestId } = renderComponent();

      fireEvent.changeText(
        getByTestId('input-collectible-address'),
        VALID_ADDRESS,
      );
      fireEvent(getByTestId('input-collectible-address'), 'onBlur');

      await waitFor(() => {
        expect(getByTestId('collectible-address-warning').props.children).toBe(
          'collectible.address_must_be_smart_contract',
        );
      });
    });

    it('clears error when address is a valid smart contract on blur', async () => {
      const { getByTestId } = renderComponent();

      fireEvent.changeText(
        getByTestId('input-collectible-address'),
        VALID_ADDRESS,
      );
      fireEvent(getByTestId('input-collectible-address'), 'onBlur');

      await waitFor(() => {
        expect(getByTestId('collectible-address-warning').props.children).toBe(
          '',
        );
      });
    });
  });

  describe('token ID validation', () => {
    it('shows error when token ID is empty on blur', () => {
      const { getByTestId } = renderComponent();

      fireEvent(getByTestId('input-collectible-identifier'), 'onBlur');

      expect(getByTestId('collectible-identifier-warning').props.children).toBe(
        'collectible.token_id_cant_be_empty',
      );
    });

    it('clears error when token ID has value on blur', () => {
      const { getByTestId } = renderComponent();

      fireEvent.changeText(getByTestId('input-collectible-identifier'), '123');
      fireEvent(getByTestId('input-collectible-identifier'), 'onBlur');

      expect(getByTestId('collectible-identifier-warning').props.children).toBe(
        '',
      );
    });
  });

  describe('ownership validation', () => {
    it('shows toast when user is not the owner', async () => {
      (Engine.context.NftController.isNftOwner as jest.Mock).mockResolvedValue(
        false,
      );

      const utils = renderComponent({
        navigation: { navigate: jest.fn(), goBack: jest.fn() },
        withToast: true,
      });

      fillForm(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('add-collectible-button'));
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'collectible.not_owner_error_title' }],
          descriptionOptions: {
            description: 'collectible.not_owner_error',
          },
        }),
      );
    });

    it('shows toast when ownership verification fails', async () => {
      (Engine.context.NftController.isNftOwner as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const utils = renderComponent({
        navigation: { navigate: jest.fn(), goBack: jest.fn() },
        withToast: true,
      });

      fillForm(utils);

      await act(async () => {
        fireEvent.press(utils.getByTestId('add-collectible-button'));
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            { label: 'collectible.ownership_verification_error_title' },
          ],
          descriptionOptions: {
            description: 'collectible.ownership_verification_error',
          },
        }),
      );
    });
  });

  describe('button state', () => {
    it('is disabled when required fields are empty', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('add-collectible-button').props.disabled).toBeTruthy();
    });

    it('is enabled when all required fields are filled', () => {
      const utils = renderComponent();
      fillForm(utils);
      expect(
        utils.getByTestId('add-collectible-button').props.disabled,
      ).toBeFalsy();
    });

    it('is disabled when network is not selected', () => {
      const utils = renderComponent({ selectedNetwork: null });
      fillForm(utils);
      expect(
        utils.getByTestId('add-collectible-button').props.disabled,
      ).toBeTruthy();
    });

    it('is disabled during loading', async () => {
      (Engine.context.NftController.addNft as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const utils = renderComponent({
        navigation: { navigate: jest.fn(), goBack: jest.fn() },
      });
      fillForm(utils);

      act(() => {
        fireEvent.press(utils.getByTestId('add-collectible-button'));
      });

      expect(
        utils.getByTestId('add-collectible-button').props.disabled,
      ).toBeTruthy();
    });
  });

  it('pre-fills address from collectibleContract prop', () => {
    const { getByTestId } = renderComponent({
      collectibleContract: { address: VALID_ADDRESS },
    });

    expect(getByTestId('input-collectible-address').props.value).toBe(
      VALID_ADDRESS,
    );
  });

  it('navigates back when cancel is pressed', () => {
    const mockGoBack = jest.fn();

    const { getByText } = renderComponent({
      navigation: { navigate: jest.fn(), goBack: mockGoBack },
    });

    fireEvent.press(getByText('add_asset.collectibles.cancel_add_collectible'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call addNft when validation fails', async () => {
    const utils = renderComponent({
      navigation: { navigate: jest.fn(), goBack: jest.fn() },
    });

    await act(async () => {
      fireEvent.press(utils.getByTestId('add-collectible-button'));
    });

    expect(Engine.context.NftController.addNft).not.toHaveBeenCalled();
  });
});
