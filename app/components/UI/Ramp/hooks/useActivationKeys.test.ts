import { act, waitFor } from '@testing-library/react-native';
import useActivationKeys from './useActivationKeys';
import { SDK } from '../sdk';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import { ActivationKey } from '../../../../reducers/fiatOrders/types';

jest.mock('../sdk', () => ({
  SDK: {
    getActivationKeys: jest.fn().mockReturnValue([]),
    setActivationKeys: jest.fn(),
  },
}));

function renderHookWithActivationKeys(
  hook: () => ReturnType<typeof useActivationKeys>,
  activationKeys: ActivationKey[] = [],
) {
  return renderHookWithProvider(hook, {
    state: {
      ...initialRootState,
      fiatOrders: {
        ...initialRootState.fiatOrders,
        activationKeys,
      },
    },
  });
}

const mockStoredKeys = [
  {
    key: 'key1',
    label: 'key1-label',
    active: true,
  },
  {
    key: 'key2',
    label: 'key2-label',
    active: false,
  },
  {
    key: 'key3',
    label: 'key3-label',
    active: true,
  },
];

describe('useActivationKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call SDK.setActivationKeys with active stored keys and return them', async () => {
    const storedKeys = [...mockStoredKeys];

    const activeStoredKeys = storedKeys.filter(({ active }) => active);
    const activeStoredKeysValues = activeStoredKeys.map(({ key }) => key);
    (
      SDK.getActivationKeys as jest.MockedFunction<typeof SDK.getActivationKeys>
    ).mockReturnValueOnce(activeStoredKeysValues);

    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: true,
        }),
      storedKeys,
    );

    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));

    expect(SDK.setActivationKeys).toHaveBeenCalledWith(activeStoredKeysValues);
    expect(result.current.activationKeys).toEqual(storedKeys);
  });

  it('should early return if options.internal is false and return inactive keys', async () => {
    const storedKeys = [...mockStoredKeys];

    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: false,
        }),
      storedKeys,
    );

    expect(SDK.setActivationKeys).not.toHaveBeenCalled();
    expect(SDK.getActivationKeys).not.toHaveBeenCalled();
    expect(
      (result.current.activationKeys as ActivationKey[]).every(
        ({ active }) => !active,
      ),
    ).toBe(true);
  });

  it('should early return if options is empty and return inactive keys', async () => {
    const storedKeys = [...mockStoredKeys];

    const { result } = renderHookWithActivationKeys(
      () => useActivationKeys(),
      storedKeys,
    );

    expect(SDK.setActivationKeys).not.toHaveBeenCalled();
    expect(SDK.getActivationKeys).not.toHaveBeenCalled();
    expect(
      (result.current.activationKeys as ActivationKey[]).every(
        ({ active }) => !active,
      ),
    ).toBe(true);
  });

  it('should add and set activation key when calling addActivationKey', async () => {
    const storedKeys = [...mockStoredKeys];
    const activeStoredKeysNames = storedKeys
      .filter(({ active }) => active)
      .map(({ key }) => key);
    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: true,
        }),
      storedKeys,
    );
    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));

    act(() => {
      result.current.addActivationKey('key4', 'key4-label');
    });

    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));
    expect(SDK.setActivationKeys).toHaveBeenLastCalledWith([
      ...activeStoredKeysNames,
      'key4',
    ]);

    /** We expect all keys to be false because we did not mock
     * `SDK.getActivationKeys` to return the SDK keys array.
     * It is currently returning `[]`, marking al stored keys as inactive
     */
    expect(result.current.activationKeys).toEqual([
      ...storedKeys.map((key) => ({ ...key, active: false })),
      {
        key: 'key4',
        label: 'key4-label',
        active: false,
      },
    ]);
  });

  it('should remove activation key when calling removeActivationKey', async () => {
    const storedKeys = [...mockStoredKeys];
    const activeStoredKeysNames = storedKeys
      .filter(({ active }) => active)
      .map(({ key }) => key);
    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: true,
        }),
      storedKeys,
    );
    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));

    act(() => {
      result.current.removeActivationKey('key3');
    });

    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));
    expect(SDK.setActivationKeys).toHaveBeenLastCalledWith([
      ...activeStoredKeysNames.filter((key) => key !== 'key3'),
    ]);

    /** We expect all keys to be false because we did not mock
     * `SDK.getActivationKeys` to return the SDK keys array.
     * It is currently returning `[]`, marking al stored keys as inactive
     */
    expect(result.current.activationKeys).toEqual([
      ...storedKeys
        .filter(({ key }) => key !== 'key3')
        .map((activationKey) => ({ ...activationKey, active: false })),
    ]);
  });

  it('should update activation key when calling updateActivationKey', async () => {
    const storedKeys = [...mockStoredKeys];
    const activeStoredKeysNames = storedKeys
      .filter(({ active }) => active)
      .map(({ key }) => key);
    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: true,
        }),
      storedKeys,
    );
    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));

    act(() => {
      result.current.updateActivationKey('key3', 'key3-label', false);
    });

    waitFor(() => expect(result.current.isLoadingKeys).toBe(false));
    expect(SDK.setActivationKeys).toHaveBeenLastCalledWith([
      ...activeStoredKeysNames.filter((key) => key !== 'key3'),
    ]);

    /** We expect all keys to be false because we did not mock
     * `SDK.getActivationKeys` to return the SDK keys array.
     * It is currently returning `[]`, marking al stored keys as inactive
     */
    expect(result.current.activationKeys).toEqual([
      ...storedKeys.map((activationKey) => ({
        ...activationKey,
        active: false,
      })),
    ]);
  });

  it('should call SDK.setActivationKeys with active stored only once if is provider instance and ignore function calls', async () => {
    const storedKeys = [...mockStoredKeys];

    const activeStoredKeys = storedKeys.filter(({ active }) => active);
    const activeStoredKeysNames = activeStoredKeys.map(({ key }) => key);
    (
      SDK.getActivationKeys as jest.MockedFunction<typeof SDK.getActivationKeys>
    ).mockReturnValueOnce(activeStoredKeysNames);

    const { result } = renderHookWithActivationKeys(
      () =>
        useActivationKeys({
          internal: true,
          provider: true,
        }),
      storedKeys,
    );

    expect(SDK.setActivationKeys).toHaveBeenCalledTimes(1);
    expect(SDK.setActivationKeys).toHaveBeenCalledWith(activeStoredKeysNames);
    expect(result.current.activationKeys).toEqual(storedKeys);
  });
});
