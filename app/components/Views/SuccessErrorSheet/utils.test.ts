import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import {
  navigateToSuccessErrorSheet,
  navigateToSuccessErrorSheetPromise,
} from './utils';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NavigationProp<ParamListBase>;

const baseParams = {
  type: 'error' as const,
  title: 'Error Title',
  description: 'Error description',
};

describe('navigateToSuccessErrorSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards params to the success error sheet route', () => {
    const onClose = jest.fn();
    const onPrimaryButtonPress = jest.fn();
    const params = {
      ...baseParams,
      type: 'success' as const,
      onClose,
      onPrimaryButtonPress,
      descriptionAlign: 'center' as const,
      primaryButtonLabel: 'OK',
    };

    navigateToSuccessErrorSheet(mockNavigation, params);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: expect.objectContaining({
        type: 'success',
        onClose,
        onPrimaryButtonPress,
        descriptionAlign: 'center',
        primaryButtonLabel: 'OK',
      }),
    });
  });
});

describe('navigateToSuccessErrorSheetPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves and invokes the original onPrimaryButtonPress callback', async () => {
    const onPrimaryButtonPress = jest.fn();

    mockNavigate.mockImplementation((_route, params) => {
      params.params.onPrimaryButtonPress();
    });

    await expect(
      navigateToSuccessErrorSheetPromise(mockNavigation, {
        ...baseParams,
        onPrimaryButtonPress,
      }),
    ).resolves.toBeUndefined();

    expect(onPrimaryButtonPress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      }),
    );
  });

  it('resolves and invokes the original onSecondaryButtonPress callback', async () => {
    const onSecondaryButtonPress = jest.fn();

    mockNavigate.mockImplementation((_route, params) => {
      params.params.onSecondaryButtonPress();
    });

    await expect(
      navigateToSuccessErrorSheetPromise(mockNavigation, {
        ...baseParams,
        onSecondaryButtonPress,
      }),
    ).resolves.toBeUndefined();

    expect(onSecondaryButtonPress).toHaveBeenCalledTimes(1);
  });

  it('resolves and invokes the original onClose callback', async () => {
    const onClose = jest.fn();

    mockNavigate.mockImplementation((_route, params) => {
      params.params.onClose();
    });

    await expect(
      navigateToSuccessErrorSheetPromise(mockNavigation, {
        ...baseParams,
        onClose,
      }),
    ).resolves.toBeUndefined();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
