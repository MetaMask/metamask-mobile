import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import Engine from '../../../../../../core/Engine';
import { countryCodeToFlag } from '../../../../Card/util/countryCodeToFlag';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../../selectors/geolocationController';
import { useVbaEligibility } from '../hooks/useVbaEligibility';

/**
 * DEBUG: remove before marking the Brazil geo-gate PR ready for review.
 * Shows every input to `useVbaEligibility()` and the result. Tap to re-run the
 * IP geolocation lookup (e.g. after switching VPN).
 */
export const VBA_ELIGIBILITY_DEBUG_CHIP_TEST_ID = 'vba-eligibility-debug-chip';

const styles = StyleSheet.create({
  floating: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  inline: {},
});

const toFlag = (regionCode: string | undefined): string =>
  !regionCode || regionCode === UNKNOWN_LOCATION
    ? countryCodeToFlag(undefined)
    : countryCodeToFlag(regionCode.split('-')[0]);

const VbaEligibilityDebugChip = ({
  floating = false,
}: {
  floating?: boolean;
}) => {
  const {
    isEligible,
    isLoading,
    isFlagEnabled,
    isDevBypassEnabled,
    regionCode,
    regionSource,
  } = useVbaEligibility();
  const ipLocation = useSelector(selectGeolocationLocation);
  const ipStatus = useSelector(selectGeolocationStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshGeolocation = useCallback(async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      await Engine.context.GeolocationController?.refreshGeolocation?.();
    } catch {
      // Debug only; the chip re-renders from state either way.
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const parts = [
    `${toFlag(regionCode)} ${regionCode ?? 'none'} (${regionSource})`,
    `ip ${toFlag(ipLocation)} ${ipLocation?.trim() || 'unknown'} [${ipStatus ?? 'n/a'}]`,
    `flag ${isFlagEnabled ? 'on' : 'off'}`,
    isDevBypassEnabled ? 'bypass' : null,
    isLoading ? 'loading' : isEligible ? 'eligible' : 'not eligible',
    isRefreshing ? 'refreshing…' : 'tap to refresh ip',
  ].filter(Boolean);

  return (
    <Pressable
      onPress={refreshGeolocation}
      style={floating ? styles.floating : styles.inline}
      testID={VBA_ELIGIBILITY_DEBUG_CHIP_TEST_ID}
    >
      <Box
        twClassName={
          floating
            ? 'rounded-full bg-muted px-3 py-1'
            : 'items-center pb-2 px-4'
        }
      >
        <Text variant={TextVariant.BodyXs} color={TextColor.ErrorDefault}>
          {`DEBUG ${parts.join(' · ')}`}
        </Text>
      </Box>
    </Pressable>
  );
};

export default VbaEligibilityDebugChip;
