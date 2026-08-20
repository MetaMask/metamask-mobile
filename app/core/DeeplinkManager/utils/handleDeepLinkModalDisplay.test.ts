import handleDeepLinkModalDisplay from './handleDeepLinkModalDisplay';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import { RootState } from '../../../reducers';

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

describe('handleDeepLinkModalDisplay', () => {
  const mockReduxService = ReduxService as jest.Mocked<typeof ReduxService>;
  beforeEach(() => {
    jest.clearAllMocks();
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
    async ({ linkType, isDeepLinkModalDisabled, shouldRedirect }) => {
      const mockedState = {
        settings: { deepLinkModalDisabled: isDeepLinkModalDisabled },
      } as RootState;
      jest.mocked(mockReduxService.store.getState).mockReturnValue(mockedState);

      await handleDeepLinkModalDisplay({
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
