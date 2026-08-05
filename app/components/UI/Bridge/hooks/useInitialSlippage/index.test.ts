import { renderHook } from '@testing-library/react-hooks';
import {
  selectIsSlippageUserOverride,
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useInitialSlippage } from '.';

const mockDispatch = jest.fn();
const mockValues = new Map();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => mockValues.get(selector),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectIsSlippageUserOverride: jest.fn(),
  selectSlippage: jest.fn(),
  setSlippage: jest.fn((payload) => ({ type: 'bridge/setSlippage', payload })),
}));

describe('useInitialSlippage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValues.set(selectSlippage, undefined);
    mockValues.set(selectIsSlippageUserOverride, false);
  });

  it('hydrates an unset current-pair quote', () => {
    renderHook(() => useInitialSlippage(1.5, true));

    expect(setSlippage).toHaveBeenCalledWith('1.5');
    expect(mockDispatch).toHaveBeenCalled();
  });

  it.each([
    ['the quote is stale', false, undefined, false],
    ['slippage is already set', true, '2', false],
    ['the user selected Auto', true, undefined, true],
  ])('does not hydrate when %s', (_label, isCurrent, slippage, isOverride) => {
    mockValues.set(selectSlippage, slippage);
    mockValues.set(selectIsSlippageUserOverride, isOverride);

    renderHook(() => useInitialSlippage(1.5, isCurrent));

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
