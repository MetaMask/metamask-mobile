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

  it('calls navigation.navigate with ROOT_MODAL_FLOW route and SUCCESS_ERROR_SHEET screen', () => {
    navigateToSuccessErrorSheet(mockNavigation, baseParams);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: baseParams,
    });
  });

  it('passes all params including optional callbacks to navigation', () => {
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

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        params: expect.objectContaining({
          type: 'success',
          onClose,
          onPrimaryButtonPress,
          descriptionAlign: 'center',
          primaryButtonLabel: 'OK',
        }),
      }),
    );
  });
});

describe('navigateToSuccessErrorSheetPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls navigation.navigate with SUCCESS_ERROR_SHEET screen', async () => {
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onClose();
    });

    await navigateToSuccessErrorSheetPromise(mockNavigation, baseParams);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      }),
    );
  });

  it('resolves with true when onPrimaryButtonPress is called', async () => {
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onPrimaryButtonPress();
    });

    const result = await navigateToSuccessErrorSheetPromise(
      mockNavigation,
      baseParams,
    );

    expect(result).toBe(true);
  });

  it('resolves with false when onSecondaryButtonPress is called', async () => {
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onSecondaryButtonPress();
    });

    const result = await navigateToSuccessErrorSheetPromise(
      mockNavigation,
      baseParams,
    );

    expect(result).toBe(false);
  });

  it('resolves with false when onClose is called', async () => {
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onClose();
    });

    const result = await navigateToSuccessErrorSheetPromise(
      mockNavigation,
      baseParams,
    );

    expect(result).toBe(false);
  });

  it('invokes the original onPrimaryButtonPress callback when provided', async () => {
    const originalCallback = jest.fn();
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onPrimaryButtonPress();
    });

    await navigateToSuccessErrorSheetPromise(mockNavigation, {
      ...baseParams,
      onPrimaryButtonPress: originalCallback,
    });

    expect(originalCallback).toHaveBeenCalledTimes(1);
  });

  it('invokes the original onSecondaryButtonPress callback when provided', async () => {
    const originalCallback = jest.fn();
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onSecondaryButtonPress();
    });

    await navigateToSuccessErrorSheetPromise(mockNavigation, {
      ...baseParams,
      onSecondaryButtonPress: originalCallback,
    });

    expect(originalCallback).toHaveBeenCalledTimes(1);
  });

  it('invokes the original onClose callback when provided', async () => {
    const originalCallback = jest.fn();
    mockNavigate.mockImplementation((_route, params) => {
      params.params.onClose();
    });

    await navigateToSuccessErrorSheetPromise(mockNavigation, {
      ...baseParams,
      onClose: originalCallback,
    });

    expect(originalCallback).toHaveBeenCalledTimes(1);
  });

  it('does not invoke other callbacks when onPrimaryButtonPress resolves', async () => {
    const onSecondaryButtonPress = jest.fn();
    const onClose = jest.fn();

    mockNavigate.mockImplementation((_route, params) => {
      params.params.onPrimaryButtonPress();
    });

    await navigateToSuccessErrorSheetPromise(mockNavigation, {
      ...baseParams,
      onSecondaryButtonPress,
      onClose,
    });

    expect(onSecondaryButtonPress).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
