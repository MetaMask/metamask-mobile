import { createTronAccount } from './tron.flow';
import Assertions from '../framework/Assertions';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import AddNewAccountSheet from '../page-objects/wallet/AddNewAccountSheet';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';

jest.mock('../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
  },
}));

jest.mock('../page-objects/wallet/AccountListBottomSheet', () => ({
  __esModule: true,
  default: {
    accountList: 'account-list',
    tapAddAccountButton: jest.fn(),
  },
}));

jest.mock('../page-objects/wallet/AddNewAccountSheet', () => ({
  __esModule: true,
  default: {
    tapConfirmButton: jest.fn(),
  },
}));

jest.mock('../framework/Gestures', () => ({
  __esModule: true,
  default: {
    tap: jest.fn(),
  },
}));

jest.mock('../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn().mockReturnValue('tron-account-button'),
  },
}));

describe('tron flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms Tron account creation after selecting the add Tron account action', async () => {
    await createTronAccount();

    expect(Assertions.expectElementToBeVisible).toHaveBeenCalledWith(
      AccountListBottomSheet.accountList,
    );
    expect(AccountListBottomSheet.tapAddAccountButton).toHaveBeenCalled();
    expect(Gestures.tap).toHaveBeenCalledWith('tron-account-button');
    expect(AddNewAccountSheet.tapConfirmButton).toHaveBeenCalled();
    expect(Matchers.getElementByID).toHaveBeenCalledWith(
      'add-account-add-tron-account',
    );
  });
});
