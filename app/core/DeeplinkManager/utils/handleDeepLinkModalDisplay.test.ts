import handleDeepLinkModalDisplay from './handleDeepLinkModalDisplay';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import { RootState } from '../../../reducers';
import { DeepLinkModalLinkType } from '../types/deepLink.types';

jest.mock('../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

jest.mock('../../../components/UI/DeepLinkModal', () => ({
  createDeepLinkModalNavDetails: jest.fn(() => ['DeepLinkModal', {}]),
}));

jest.mock('../../../selectors/settings', () => ({
  selectDeepLinkModalDisabled: (state: RootState) =>
    state.settings.deepLinkModalDisabled,
}));

describe('handleDeepLinkModalDisplay', () => {
  const mockReduxService = ReduxService as jest.Mocked<typeof ReduxService>;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a required private-link confirmation even when reminders are disabled', () => {
    const state = {
      settings: { deepLinkModalDisabled: true },
    } as RootState;
    jest.mocked(mockReduxService.store.getState).mockReturnValue(state);
    const onContinue = jest.fn();

    const result = handleDeepLinkModalDisplay(
      {
        linkType: DeepLinkModalLinkType.PRIVATE,
        pageTitle: 'MetaMask',
        onContinue,
        onBack: jest.fn(),
      },
      { forceShow: true },
    );

    expect(NavigationService.navigation.navigate).toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it.each`
    linkType     | isDeepLinkModalDisabled | shouldRedirect
    ${'public'}  | ${true}                 | ${true}
    ${'public'}  | ${false}                | ${true}
    ${'private'} | ${true}                 | ${false}
    ${'private'} | ${false}                | ${true}
    ${'invalid'} | ${true}                 | ${true}
    ${'invalid'} | ${false}                | ${true}
  `(
    'redirects to $shouldRedirect when linkType is $linkType & isDeepLinkModalDisabled is $isDeepLinkModalDisabled',
    ({ linkType, isDeepLinkModalDisabled, shouldRedirect }) => {
      const mockedState = {
        settings: { deepLinkModalDisabled: isDeepLinkModalDisabled },
      } as RootState;
      jest.mocked(mockReduxService.store.getState).mockReturnValue(mockedState);

      handleDeepLinkModalDisplay({
        linkType,
        pageTitle: 'MetaMask',
        onContinue: jest.fn(),
        onBack: jest.fn(),
      });

      if (shouldRedirect) {
        expect(NavigationService.navigation.navigate).toHaveBeenCalled();
      } else {
        expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
      }
    },
  );
});
