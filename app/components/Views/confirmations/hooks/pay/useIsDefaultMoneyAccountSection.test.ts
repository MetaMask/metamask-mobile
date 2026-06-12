import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsDefaultMoneyAccountSection } from './useIsDefaultMoneyAccountSection';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { PayWithOption } from '../../components/confirm/confirm-component';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayFlags: jest.fn(),
  }),
);

const MONEY_ACCOUNT_ADDRESS = '0xabc1111111111111111111111111111111111111';

const DEFAULT_FLAGS = {
  defaultPaySelectedSection: undefined,
};

const render = () =>
  renderHookWithProvider(() => useIsDefaultMoneyAccountSection());

describe('useIsDefaultMoneyAccountSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({});
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue(
      DEFAULT_FLAGS,
    );
  });

  it('returns false when flag is not set', () => {
    const { result } = render();
    expect(result.current).toBe(false);
  });

  it('returns true when flag is "money-account" and money account exists', () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      defaultPaySelectedSection: 'money-account',
    });

    const { result } = render();
    expect(result.current).toBe(true);
  });

  it('returns false when flag is "money-account" but no money account', () => {
    (selectPrimaryMoneyAccount as unknown as jest.Mock).mockReturnValue(
      undefined,
    );
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      defaultPaySelectedSection: 'money-account',
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it('returns false when flag is a different value', () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      defaultPaySelectedSection: 'crypto',
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });

  it('returns false when payWithOption is already set', () => {
    (useParams as jest.Mock).mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      defaultPaySelectedSection: 'money-account',
    });

    const { result } = render();
    expect(result.current).toBe(false);
  });
});
