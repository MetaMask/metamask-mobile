import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addActivationKey,
  getActivationKeys,
  removeActivationKey,
  updateActivationKey,
} from '../../../../reducers/fiatOrders';
import { SDK } from '../sdk';

interface Options {
  provider?: boolean;
  internal?: boolean;
}

export default function useActivationKeys(
  options: Options = {
    provider: false,
    internal: false,
  },
) {
  const dispatch = useDispatch();
  const [sdkActivationKeys, setSdkActivationKeys] = useState<string[]>(() =>
    SDK.getActivationKeys(),
  );
  const deviceActivationKeys = useSelector(getActivationKeys);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [providerInitialized, setProviderInitialized] = useState(false);

  useEffect(() => {
    if (!options.internal) {
      return;
    }
    if (options.provider && providerInitialized) {
      return;
    }
    (async () => {
      setIsLoadingKeys(true);
      await SDK.setActivationKeys(
        deviceActivationKeys
          .filter(({ active }) => active)
          .map(({ key }) => key),
      );
      const sdkKeys = SDK.getActivationKeys();
      setSdkActivationKeys(sdkKeys);
      setIsLoadingKeys(false);
      if (options?.provider) {
        setProviderInitialized(true);
      }
    })();
  }, [
    deviceActivationKeys,
    options.internal,
    options.provider,
    providerInitialized,
  ]);

  const activationKeys = useMemo(() => {
    const keys = deviceActivationKeys.map((activationKey) => ({
      ...activationKey,
      active: sdkActivationKeys.includes(activationKey.key),
    }));
    return keys;
  }, [sdkActivationKeys, deviceActivationKeys]);

  const dispatchAddActivationKey: (
    ...args: Parameters<typeof addActivationKey>
  ) => void = useCallback(
    (key: string) => dispatch(addActivationKey(key)),
    [dispatch],
  );

  const dispatchRemoveActivationKey: (
    ...args: Parameters<typeof removeActivationKey>
  ) => void = useCallback(
    (key: string) => dispatch(removeActivationKey(key)),
    [dispatch],
  );

  const dispatchUpdateActivationKey: (
    ...args: Parameters<typeof updateActivationKey>
  ) => void = useCallback(
    (activationKey, active) =>
      dispatch(updateActivationKey(activationKey, active)),
    [dispatch],
  );
  return {
    isLoadingKeys,
    activationKeys,
    addActivationKey: dispatchAddActivationKey,
    removeActivationKey: dispatchRemoveActivationKey,
    updateActivationKey: dispatchUpdateActivationKey,
  };
}
