import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { useRampsUserRegion } from '../hooks/useRampsUserRegion';
import {
  DEBUG_US_REGION_CA,
  DEBUG_US_REGION_COUNTRY,
  ensureDebugUserRegion,
} from './debugUserRegion';
/**
 * Dev-only region override on native-flow screens (e.g. Enter Address).
 */
export function RampDebugRegionBar(): React.ReactElement | null {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { userRegion, setUserRegion } = useRampsUserRegion();
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const applyRegion = useCallback(
    async (regionCode: string) => {
      setPending(true);
      setLastError(null);
      try {
        await ensureDebugUserRegion(setUserRegion, regionCode);
      } catch (error) {
        setLastError(
          error instanceof Error ? error.message : 'setUserRegion failed',
        );
      } finally {
        setPending(false);
      }
    },
    [setUserRegion],
  );

  const openRegionSelector = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.REGION_SELECTOR as never);
  }, [navigation]);

  const countryLabel =
    userRegion?.country?.name ?? userRegion?.regionCode ?? 'unknown';

  return (
    <Box twClassName="mx-4 mb-3 rounded-lg border border-warning-default bg-warning-muted p-3">
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        Debug region: {countryLabel}
        {userRegion?.state?.name ? ` · ${userRegion.state.name}` : ''}
      </Text>
      {lastError ? (
        <Text variant={TextVariant.BodyXs} twClassName="text-error-default mt-1">
          {lastError}
        </Text>
      ) : null}
      <Box twClassName="mt-2 flex-row flex-wrap gap-2">
        <Pressable
          disabled={pending}
          onPress={() => applyRegion(DEBUG_US_REGION_COUNTRY)}
          style={tw.style('rounded-md bg-default border border-muted px-3 py-2')}
        >
          <Text variant={TextVariant.BodyXs}>Set US</Text>
        </Pressable>
        <Pressable
          disabled={pending}
          onPress={() => applyRegion(DEBUG_US_REGION_CA)}
          style={tw.style('rounded-md bg-default border border-muted px-3 py-2')}
        >
          <Text variant={TextVariant.BodyXs}>Set US-CA</Text>
        </Pressable>
        <Pressable
          disabled={pending}
          onPress={openRegionSelector}
          style={tw.style('rounded-md bg-default border border-muted px-3 py-2')}
        >
          <Text variant={TextVariant.BodyXs}>Region picker</Text>
        </Pressable>
      </Box>
    </Box>
  );
}

export default RampDebugRegionBar;
