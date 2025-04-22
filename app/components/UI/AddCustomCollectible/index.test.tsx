import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialRootState from '../../../util/test/initial-root-state';
import {
  validateCustomCollectibleAddress,
  validateCollectibleOwnership,
} from './util';
import { isValidAddress } from 'ethereumjs-util';
import { isSmartContractAddress } from '../../../util/transactions';
import Engine from '../../../core/Engine';

const mockStore = configureMockStore();

const store = mockStore(initialRootState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => ''),
}));

jest.mock('ethereumjs-util', () => ({
  isValidAddress: jest.fn(),
}));

jest.mock('../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      isNftOwner: jest.fn(),
    },
  },
}));

describe('AddCustomCollectible', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddCustomCollectible
          setOpenNetworkSelector={jest.fn()}
          selectedNetwork={'mainnet'}
          chainId={'0x1'}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('validateCustomCollectibleAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return invalid when address is empty', async () => {
    const result = await validateCustomCollectibleAddress('', '0x1');
    expect(result).toEqual({
      isValid: false,
      warningMessage: 'collectible.address_cant_be_empty',
    });
  });

  it('should return invalid when address is not a valid Ethereum address', async () => {
    (isValidAddress as jest.Mock).mockReturnValue(false);
    const result = await validateCustomCollectibleAddress(
      'invalid-address',
      '0x1',
    );
    expect(result).toEqual({
      isValid: false,
      warningMessage: 'collectible.address_must_be_valid',
    });
  });

  it('should return invalid when address is not a smart contract', async () => {
    (isValidAddress as jest.Mock).mockReturnValue(true);
    (isSmartContractAddress as jest.Mock).mockResolvedValue(false);
    const result = await validateCustomCollectibleAddress('0x123', '0x1');
    expect(result).toEqual({
      isValid: false,
      warningMessage: 'collectible.address_must_be_smart_contract',
    });
  });

  it('should return valid when address is a valid smart contract', async () => {
    (isValidAddress as jest.Mock).mockReturnValue(true);
    (isSmartContractAddress as jest.Mock).mockResolvedValue(true);
    const result = await validateCustomCollectibleAddress('0x123', '0x1');
    expect(result).toEqual({
      isValid: true,
      warningMessage: '',
    });
  });

  it('should not check smart contract when chainId is not provided', async () => {
    (isValidAddress as jest.Mock).mockReturnValue(true);
    const result = await validateCustomCollectibleAddress('0x123');
    expect(result).toEqual({
      isValid: true,
      warningMessage: '',
    });
    expect(isSmartContractAddress).not.toHaveBeenCalled();
  });
});

describe('validateCollectibleOwnership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false with error when verification fails', async () => {
    (Engine.context.NftController.isNftOwner as jest.Mock).mockRejectedValue(
      new Error('Verification failed'),
    );
    const result = await validateCollectibleOwnership('0x123', '0x456', '789');
    expect(result).toEqual({
      isOwner: false,
      error: {
        title: 'collectible.ownership_verification_error_title',
        message: 'collectible.ownership_verification_error',
      },
    });
  });
});
