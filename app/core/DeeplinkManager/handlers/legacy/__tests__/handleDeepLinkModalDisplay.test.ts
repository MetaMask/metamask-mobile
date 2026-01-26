import handleDeepLinkModalDisplay from '../handleDeepLinkModalDisplay';
import { waitFor } from '@testing-library/react-native';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import { RootState } from '../../../../../reducers';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

jest.mock('../../../../../components/UI/DeepLinkModal', () => ({
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
      (mockReduxService.store.getState as jest.Mock).mockReturnValue(
        mockedState,
      );
      handleDeepLinkModalDisplay({
        linkType,
        pageTitle: 'MetaMask',
        onContinue: jest.fn(),
        onBack: jest.fn(),
      });
      if (shouldRedirect) {
        await waitFor(() => {
          expect(NavigationService.navigation.navigate).toHaveBeenCalled();
        });
      } else {
        await waitFor(() => {
          expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
        });
      }
    },
  );
});
