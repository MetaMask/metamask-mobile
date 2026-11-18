import { act, renderHook } from '@testing-library/react-native';
import { setPerpsCrossMarginConfirmed } from '../../../../../../../actions/settings';
import { selectHasConfirmedCrossMargin } from '../../../../selectors/crossMarginConfirmation';
import { selectPerpsSelectedAccountAddress } from '../../../../selectors/selectedAccountAddress';
import { usePerpsProCrossMarginConfirm } from './usePerpsProCrossMarginConfirm';

const ACCOUNT_A = '0xaaa';
const ACCOUNT_B = '0xbbb';

const mockDispatch = jest.fn();
const mockSelectorValues = new Map<unknown, unknown>();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => mockSelectorValues.get(selector),
}));

const setSelectedAccount = (address: string | undefined) =>
  mockSelectorValues.set(selectPerpsSelectedAccountAddress, address);

const renderConfirmHook = () => {
  const onMarginModeSelect = jest.fn();
  const hook = renderHook(() =>
    usePerpsProCrossMarginConfirm({
      marginMode: 'isolated',
      onMarginModeSelect,
    }),
  );
  return { ...hook, onMarginModeSelect };
};

/** Pick Cross in the margin mode sheet, then let that sheet finish closing. */
const requestCross = (
  result: ReturnType<typeof renderConfirmHook>['result'],
) => {
  act(() => result.current.onMarginModeSelect('cross'));
  act(() => result.current.onMarginModeSheetClosed());
};

describe('usePerpsProCrossMarginConfirm', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockSelectorValues.clear();
    mockSelectorValues.set(selectHasConfirmedCrossMargin, false);
    setSelectedAccount(ACCOUNT_A);
  });

  it('holds the confirm sheet until the margin mode sheet has closed', () => {
    const { result, onMarginModeSelect } = renderConfirmHook();

    act(() => result.current.onMarginModeSelect('cross'));

    expect(result.current.isCrossConfirmVisible).toBe(false);
    expect(onMarginModeSelect).not.toHaveBeenCalled();

    act(() => result.current.onMarginModeSheetClosed());

    expect(result.current.isCrossConfirmVisible).toBe(true);
  });

  it('stores the confirmation for the account and selects Cross on confirm', () => {
    const { result, onMarginModeSelect } = renderConfirmHook();
    requestCross(result);

    act(() => result.current.confirmCrossMargin());

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsCrossMarginConfirmed(ACCOUNT_A),
    );
    expect(onMarginModeSelect).toHaveBeenCalledWith('cross');
    expect(result.current.isCrossConfirmVisible).toBe(false);
  });

  it('drops a pending Cross request when the account changes before the sheet closes', () => {
    const { result, rerender, onMarginModeSelect } = renderConfirmHook();
    act(() => result.current.onMarginModeSelect('cross'));

    setSelectedAccount(ACCOUNT_B);
    rerender({});
    act(() => result.current.onMarginModeSheetClosed());

    expect(result.current.isCrossConfirmVisible).toBe(false);
    expect(onMarginModeSelect).not.toHaveBeenCalled();
  });

  it('selects Cross without storing a confirmation when no account is selected', () => {
    setSelectedAccount(undefined);
    const { result, onMarginModeSelect } = renderConfirmHook();
    requestCross(result);

    act(() => result.current.confirmCrossMargin());

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(onMarginModeSelect).toHaveBeenCalledWith('cross');
  });
});
