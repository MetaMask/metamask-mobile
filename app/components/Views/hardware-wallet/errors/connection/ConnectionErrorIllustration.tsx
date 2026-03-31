import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

import LedgerDeviceIllustration from '../../components/LedgerDeviceIllustration';

export type ConnectionErrorIllustrationVariant =
  | 'bluetoothAccessDenied'
  | 'locationAccessDenied'
  | 'nearbyDevicesDenied'
  | 'bluetoothDisabled'
  | 'bluetoothConnectionFailed';

type ConnectionErrorIllustrationProps = {
  variant: ConnectionErrorIllustrationVariant;
};

const ConnectionErrorIllustration = ({
  variant,
}: ConnectionErrorIllustrationProps) => {
  const tw = useTailwind();
  const showsSlash =
    variant === 'bluetoothAccessDenied' ||
    variant === 'bluetoothConnectionFailed';
  const showsLock =
    variant !== 'bluetoothDisabled' && variant !== 'nearbyDevicesDenied';

  const badgeClassName =
    variant === 'locationAccessDenied' || variant === 'nearbyDevicesDenied'
      ? 'bg-primary-muted'
      : 'bg-info-muted';

  const badgeIcon =
    variant === 'locationAccessDenied' || variant === 'nearbyDevicesDenied'
      ? IconName.Location
      : IconName.Connect;

  return (
    <Box twClassName="relative h-[300px] w-full items-center justify-center">
      <LedgerDeviceIllustration
        state={variant === 'bluetoothDisabled' ? 'not-found' : 'found'}
      />

      <Box
        twClassName={`absolute left-[38px] top-[114px] h-[104px] w-[104px] items-center justify-center rounded-full border border-muted ${badgeClassName}`}
      >
        <Icon name={badgeIcon} size={IconSize.Xl} color={IconColor.IconDefault} />
        {showsSlash ? (
          <Box
            twClassName="absolute h-3 w-[118px] rounded-full bg-error-default"
            style={tw.style({
              transform: [{ rotate: '-48deg' }],
            })}
          />
        ) : null}
      </Box>

      {showsLock ? (
        <Box twClassName="absolute left-[128px] top-[170px] h-[56px] w-[56px] items-center justify-center rounded-2xl border border-muted bg-default">
          <Icon name={IconName.Lock} size={IconSize.Md} />
        </Box>
      ) : null}

      {variant === 'bluetoothDisabled' ? (
        <Box
          twClassName="absolute left-[124px] top-[178px] h-[34px] w-[80px] flex-row items-center rounded-full border border-muted bg-muted px-1"
          style={tw.style('justify-end')}
        >
          <Box twClassName="h-[24px] w-[24px] rounded-full bg-error-default" />
        </Box>
      ) : null}
    </Box>
  );
};

export default ConnectionErrorIllustration;
