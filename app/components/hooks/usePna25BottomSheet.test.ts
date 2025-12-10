import { usePna25BottomSheet } from './usePna25BottomSheet';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import Routes from '../../constants/navigation/Routes';
import { selectShouldShowPna25Toast } from '../../selectors/legalNotices';
import { STORE_PNA25_ACKNOWLEDGED } from '../../actions/legalNotices';

// Mock the navigation
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Mock the selector
jest.mock('../../selectors/legalNotices', () => ({
  selectShouldShowPna25Toast: jest.fn(),
}));

const mockSelectShouldShowPna25Toast =
  selectShouldShowPna25Toast as jest.MockedFunction<
    typeof selectShouldShowPna25Toast
  >;

describe('usePna25BottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates and dispatches acknowledgement when should show PNA25 is true', async () => {
    mockSelectShouldShowPna25Toast.mockReturnValue(true);

    renderHookWithProvider(() => usePna25BottomSheet());

    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: STORE_PNA25_ACKNOWLEDGED,
    });
  });

  it('does not navigate or dispatch when should show PNA25 is false', async () => {
    mockSelectShouldShowPna25Toast.mockReturnValue(false);

    renderHookWithProvider(() => usePna25BottomSheet());

    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
