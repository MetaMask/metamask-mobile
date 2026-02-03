'use strict';
import React, { useContext } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import ClipboardManager from '../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { renderAccountName } from '../../../util/address';
import { QRAccountDisplayProps } from './QRAccountDisplay.types';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

const ADDRESS_PREFIX_LENGTH = 6;
const ADDRESS_SUFFIX_LENGTH = 5;

const QRAccountDisplay = (props: QRAccountDisplayProps) => {
  const {
    accountAddress,
    label,
    labelProps,
    description,
    descriptionProps,
    analyticsLocation,
    chainId,
  } = props;
  const tw = useTailwind();
  const addr = accountAddress;
  const accounts = useSelector(selectInternalAccounts);
  const accountLabel = renderAccountName(addr, accounts);
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const addressStart = addr.substring(0, ADDRESS_PREFIX_LENGTH);
  const addressMiddle: string = addr.substring(
    ADDRESS_PREFIX_LENGTH,
    addr.length - ADDRESS_SUFFIX_LENGTH,
  );
  const addressEnd: string = addr.substring(
    addr.length - ADDRESS_SUFFIX_LENGTH,
  );

  const showCopyNotificationToast = () => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings(`notifications.address_copied_to_clipboard`),
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  };

  const handleCopyButton = async () => {
    showCopyNotificationToast();
    await ClipboardManager.setString(accountAddress);

    // Track copy event if analytics context provided
    if (analyticsLocation) {
      trackEvent(
        createEventBuilder(EVENT_NAME.ADDRESS_COPIED)
          .addProperties({
            location: analyticsLocation,
            ...(chainId && { chain_id_caip: formatChainIdToCaip(chainId) }),
          })
          .build(),
      );
    }
  };

  const renderLabel = () => {
    // If label is provided as a ReactNode, render it directly
    if (label && typeof label !== 'string') {
      return label;
    }

    // If label is provided as a string or fallback to accountLabel
    const displayLabel = typeof label === 'string' ? label : accountLabel;

    return (
      <Text
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        style={tw.style('mb-4')}
        {...labelProps}
      >
        {displayLabel}
      </Text>
    );
  };

  const renderDescription = () => {
    // If no description is provided, don't render anything
    if (!description) {
      return null;
    }

    // If description is provided as a ReactNode, render it directly
    if (typeof description !== 'string') {
      return description;
    }

    // If description is provided as a string, render it in Text component
    return (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        style={tw.style('text-center')}
        {...descriptionProps}
      >
        {description}
      </Text>
    );
  };

  return (
    <Box twClassName="bg-default items-center">
      {renderLabel()}
      {renderDescription()}
      <Box twClassName="mt-8 items-center">
        <Text
          variant={TextVariant.BodyMd}
          style={tw.style('w-[200px] text-center')}
        >
          {addressStart}
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {addressMiddle}
          </Text>
          {addressEnd}
        </Text>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          testID="qr-account-display-copy-button"
          onPress={handleCopyButton}
          endIconName={IconName.Copy}
        >
          {strings('receive_request.copy_address')}
        </Button>
      </Box>
    </Box>
  );
};

export default QRAccountDisplay;
