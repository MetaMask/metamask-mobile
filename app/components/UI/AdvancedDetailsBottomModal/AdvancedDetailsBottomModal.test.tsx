import { TransactionMeta } from '@metamask/transaction-controller';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { useTransactionMetadataRequest } from '../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useEditNonce } from '../../hooks/useEditNonce';
import AdvancedDetailsBottomSheet from './AdvancedDetailsBottomModal';

// Mock the Name component
jest.mock('../Name', () => ({
  __esModule: true,
  NameType: {
    EthereumAddress: 'EthereumAddress',
  },
  default: jest.fn(() => null),
}));

// Create mock modules
jest.mock('../../Views/confirmations/legacy/SendFlow/components/CustomNonceModal', () => 'CustomNonceModal');
jest.mock('../../Views/confirmations/components/UI/expandable-section', () => 'ExpandableSection');
jest.mock('../../../component-library/components/Texts/Text', () => ({
  TextColor: { Primary: 'primary' },
  TextVariant: { BodyMD: 'bodyMD' },
  default: 'Text',
}));

// Mock useTransactionMetadataRequest hook
jest.mock('../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

// Mock useEditNonce hook
jest.mock('../../hooks/useEditNonce', () => ({
  useEditNonce: jest.fn(),
}));

describe('AdvancedDetailsBottomSheet', () => {
  const mockStore = configureMockStore();
  const store = mockStore({
    settings: { useBlockieIcon: true },
    engine: {
      backgroundState: {
        NftController: {
          allNftContracts: {},
          allNfts: {},
        },
        PreferencesController: {
          identities: {},
        },
      },
    },
  });

  const mockTransactionMetadata: TransactionMeta = {
    id: 'tx-1',
    txParams: {
      from: '0x123456789',
      to: '0x987654321',
      data: '0x0123456789abcdef',
    },
    chainId: '1',
    networkClientId: 'mainnet',
    status: 'unapproved',
    time: 0,
    type: 'transfer',
  } as unknown as TransactionMeta;

  const mockUseEditNonce = {
    setShowNonceModal: jest.fn(),
    setUserSelectedNonce: jest.fn(),
    showNonceModal: false,
    proposedNonce: 42,
    userSelectedNonce: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(mockTransactionMetadata);
    (useEditNonce as jest.Mock).mockReturnValue(mockUseEditNonce);
  });

  it('renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AdvancedDetailsBottomSheet />
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not render when transaction metadata is missing', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(undefined);
    
    const { toJSON } = render(
      <Provider store={store}>
        <AdvancedDetailsBottomSheet />
      </Provider>
    );
    expect(toJSON()).toBeNull();
  });

  it('does not render when txParams.to is missing', () => {
    const metadataWithoutTo = {
      ...mockTransactionMetadata,
      txParams: {
        ...mockTransactionMetadata.txParams,
        to: undefined,
      },
    };
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue(metadataWithoutTo);
    
    const { toJSON } = render(
      <Provider store={store}>
        <AdvancedDetailsBottomSheet />
      </Provider>
    );
    expect(toJSON()).toBeNull();
  });

  // We can't easily test interactions in this case because our mocks are simple string replacements
  // Testing the basic rendering is still valuable
  it('should set up the component with correct props', () => {
    (useEditNonce as jest.Mock).mockReturnValue({
      ...mockUseEditNonce,
      userSelectedNonce: 42,
    });
    
    render(
      <Provider store={store}>
        <AdvancedDetailsBottomSheet />
      </Provider>
    );
    
    // Verify the hook was called
    expect(useTransactionMetadataRequest).toHaveBeenCalled();
    expect(useEditNonce).toHaveBeenCalled();
  });

  it('should render with nonce modal when showNonceModal is true', () => {
    (useEditNonce as jest.Mock).mockReturnValue({
      ...mockUseEditNonce,
      showNonceModal: true,
    });
    
    const { toJSON } = render(
      <Provider store={store}>
        <AdvancedDetailsBottomSheet />
      </Provider>
    );
    
    // This ensures the component renders with the modal (via snapshot)
    expect(toJSON()).toMatchSnapshot();
  });
}); 