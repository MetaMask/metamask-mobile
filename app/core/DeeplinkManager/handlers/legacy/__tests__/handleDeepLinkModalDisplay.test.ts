import handleDeepLinkModalDisplay from '../handleDeepLinkModalDisplay';
import { waitFor } from '@testing-library/react-native';
import NavigationService from '../../../../NavigationService';
import { store } from '../../../../../store';
import { RootState } from '../../../../../reducers';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../../store', () => ({
  store: {
    getState: jest.fn(),
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
  const mockStore = store as jest.Mocked<typeof store>;
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
    'should redirect be $shouldRedirect when linkType is $linkType & isDeepLinkModalDisabled is $isDeepLinkModalDisabled',
    async ({ linkType, isDeepLinkModalDisabled, shouldRedirect }) => {
      const mockedState = {
        settings: { deepLinkModalDisabled: isDeepLinkModalDisabled },
      } as jest.Mocked<RootState>;
      mockStore.getState.mockReturnValue(mockedState);
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
