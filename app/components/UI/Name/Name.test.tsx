import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { default as Name } from './Name';
import { NameType } from './Name.types';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';

jest.mock('../../hooks/DisplayName/useDisplayName', () => ({
  __esModule: true,
  ...jest.requireActual('../../hooks/DisplayName/useDisplayName'),
  default: jest.fn(),
}));

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const EXPECTED_UNKNOWN_ADDRESS_CHECKSUMMED = '0x29900...A5B4e';

const UNKNOWN_ADDRESS_NOT_CHECKSUMMED =
  UNKNOWN_ADDRESS_CHECKSUMMED.toLowerCase();
const KNOWN_ADDRESS_CHECKSUMMED = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NAME_MOCK = 'Known name';

describe('Name', () => {
  const mockStore = configureMockStore();
  const initialState = {
    settings: { avatarAccountType: AvatarAccountType.Maskicon },
  };
  const store = mockStore(initialState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUseDisplayName = (
    useDisplayName as jest.MockedFunction<typeof useDisplayName>
  ).mockReturnValue({
    variant: DisplayNameVariant.Unknown,
    name: KNOWN_NAME_MOCK,
  });

  describe('unknown address', () => {
    it('displays checksummed address', () => {
      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={UNKNOWN_ADDRESS_NOT_CHECKSUMMED}
            variation={CHAIN_IDS.MAINNET}
          />
        </Provider>,
      );

      expect(
        wrapper.getByText(EXPECTED_UNKNOWN_ADDRESS_CHECKSUMMED),
      ).toBeTruthy();
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('recognized address', () => {
    it('should return name', () => {
      mockUseDisplayName.mockReturnValue({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NAME_MOCK,
      });

      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={KNOWN_ADDRESS_CHECKSUMMED}
            variation={CHAIN_IDS.MAINNET}
          />
        </Provider>,
      );

      expect(wrapper.getByText(KNOWN_NAME_MOCK)).toBeTruthy();
      expect(wrapper).toMatchSnapshot();
    });

    it('should render image', () => {
      mockUseDisplayName.mockReturnValue({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NAME_MOCK,
        image: 'https://example.com/image.png',
      });

      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={KNOWN_ADDRESS_CHECKSUMMED}
            variation={CHAIN_IDS.MAINNET}
          />
        </Provider>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('renders account wallet name', () => {
      const mockAccountWalletName = 'My Wallet Account';
      mockUseDisplayName.mockReturnValue({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NAME_MOCK,
        subtitle: mockAccountWalletName,
      });

      const wrapper = render(
        <Provider store={store}>
          <Name
            type={NameType.EthereumAddress}
            value={KNOWN_ADDRESS_CHECKSUMMED}
            variation={CHAIN_IDS.MAINNET}
          />
        </Provider>,
      );

      expect(wrapper.getByText(mockAccountWalletName)).toBeTruthy();
      expect(wrapper).toMatchSnapshot();
    });
  });

  it('displays the TooltipModal when the component is pressed', async () => {
    const wrapper = render(
      <Provider store={store}>
        <Name
          type={NameType.EthereumAddress}
          value={KNOWN_ADDRESS_CHECKSUMMED}
          variation={CHAIN_IDS.MAINNET}
        />
      </Provider>,
    );

    const pressable = wrapper.getByTestId(`name-${KNOWN_ADDRESS_CHECKSUMMED}`);

    expect(wrapper.queryByText(KNOWN_ADDRESS_CHECKSUMMED)).toBeNull();

    fireEvent.press(pressable);

    await waitFor(() => {
      expect(wrapper.getByText(KNOWN_ADDRESS_CHECKSUMMED)).toBeTruthy();
    });
  });

  it('displays the full Ethereum address in the TooltipModal', async () => {
    const wrapper = render(
      <Provider store={store}>
        <Name
          type={NameType.EthereumAddress}
          value={KNOWN_ADDRESS_CHECKSUMMED}
          variation={CHAIN_IDS.MAINNET}
        />
      </Provider>,
    );

    const pressable = wrapper.getByTestId(`name-${KNOWN_ADDRESS_CHECKSUMMED}`);
    fireEvent.press(pressable);

    await waitFor(() => {
      expect(wrapper.getByText(KNOWN_ADDRESS_CHECKSUMMED)).toBeTruthy();
    });
  });

  it('hides the TooltipModal when dismissed', async () => {
    const wrapper = render(
      <Provider store={store}>
        <Name
          type={NameType.EthereumAddress}
          value={KNOWN_ADDRESS_CHECKSUMMED}
          variation={CHAIN_IDS.MAINNET}
        />
      </Provider>,
    );

    const pressable = wrapper.getByTestId(`name-${KNOWN_ADDRESS_CHECKSUMMED}`);
    fireEvent.press(pressable);

    await waitFor(() => {
      expect(wrapper.getByText(KNOWN_ADDRESS_CHECKSUMMED)).toBeTruthy();
    });

    const dismissButton = wrapper.getByTestId('tooltip-modal-close-btn');
    fireEvent.press(dismissButton);

    await waitFor(() => {
      expect(wrapper.queryByText(KNOWN_ADDRESS_CHECKSUMMED)).toBeNull();
    });
  });
});
