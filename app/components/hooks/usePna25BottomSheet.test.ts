import { usePna25BottomSheet } from './usePna25BottomSheet';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import Routes from '../../constants/navigation/Routes';
import { selectShouldShowPna25Notice } from '../../selectors/legalNotices';

// Mock the navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the selector
jest.mock('../../selectors/legalNotices', () => ({
  selectShouldShowPna25Notice: jest.fn(),
}));

const mockselectShouldShowPna25Notice =
  selectShouldShowPna25Notice as jest.MockedFunction<
    typeof selectShouldShowPna25Notice
  >;

describe('usePna25BottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates when should show PNA25 is true', async () => {
    mockselectShouldShowPna25Notice.mockReturnValue(true);

    renderHookWithProvider(() => usePna25BottomSheet());

    await new Promise(setImmediate);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET,
    });
  });

  it('does not navigate when should show PNA25 is false', async () => {
    mockselectShouldShowPna25Notice.mockReturnValue(false);

    renderHookWithProvider(() => usePna25BottomSheet());

    await new Promise(setImmediate);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
