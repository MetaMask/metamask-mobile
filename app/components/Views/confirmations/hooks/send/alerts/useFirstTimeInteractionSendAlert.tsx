import {
  Box,
  BoxFlexDirection,
  BoxFlexWrap,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Hex, hexToNumber } from '@metamask/utils';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { checkFirstTimeInteraction } from '../../../../../../util/transaction-controller';
import { useAsyncResult } from '../../../../../hooks/useAsyncResult';
import { useSendContext } from '../../../context/send-context/send-context';
import { TrustSignalDisplayState } from '../../../types/trustSignals';
import { useAddressTrustSignal } from '../../useAddressTrustSignals';
import type { SendAlert } from './types';

export function useFirstTimeInteractionSendAlert(): {
  alert: SendAlert | null;
  isPending: boolean;
} {
  const { to, from, chainId } = useSendContext();
  const internalAccounts = useSelector(
    selectInternalAccounts,
  ) as InternalAccount[];

  const trustSignalResult = useAddressTrustSignal(to ?? '', chainId ?? '');

  const isInternalAccount = useMemo(() => {
    if (!to) {
      return false;
    }
    return internalAccounts.some(
      (account) => account.address?.toLowerCase() === to.toLowerCase(),
    );
  }, [internalAccounts, to]);

  const isVerifiedAddress =
    trustSignalResult.state === TrustSignalDisplayState.Verified;

  const isTrustSignalLoading =
    trustSignalResult.state === TrustSignalDisplayState.Loading;

  const shouldSkip =
    !to ||
    !from ||
    !chainId ||
    isInternalAccount ||
    isVerifiedAddress ||
    isTrustSignalLoading;

  const { pending, value: isFirstTime } = useAsyncResult(async () => {
    if (shouldSkip) {
      return undefined;
    }
    const chainIdNum = hexToNumber(chainId as Hex);
    return checkFirstTimeInteraction({ from, to, chainId: chainIdNum });
  }, [to, from, chainId, shouldSkip]);

  const isPending = isTrustSignalLoading || (!shouldSkip && pending);

  if (shouldSkip || pending || isFirstTime !== true) {
    return { alert: null, isPending };
  }

  const message = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      flexWrap={BoxFlexWrap.Wrap}
      twClassName="w-full justify-center"
    >
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-alternative"
      >
        {strings('send.new_address_message')}{' '}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-center break-words max-w-full"
      >
        {to}
      </Text>
    </Box>
  );

  return {
    alert: {
      key: 'firstTimeInteraction',
      title: strings('send.new_address_title'),
      message,
      acknowledgeButtonLabel: strings('send.continue'),
    },
    isPending: false,
  };
}
