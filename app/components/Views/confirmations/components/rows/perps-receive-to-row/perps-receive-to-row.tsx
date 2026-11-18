import React, { useCallback, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { USDC_SYMBOL, USDC_TOKEN_ICON_URL } from '@metamask/perps-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BottomSheet,
  BottomSheetHeader,
  Box,
  KeyValueSelect,
  ListItemSelect,
  RadioButton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import images from '../../../../../../images/image-icons';
import LighterLogo from 'images/lighter.svg';
import type { SvgProps } from 'react-native-svg';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  isLighterProviderEnabled,
  isPerpsLighterConfirmationEnabled,
} from '../../../../../UI/Perps/utils/lighterFeatureFlags';
import { PerpsReceiveToSelectorsIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export type PerpsReceiveDestination = 'hyperliquid' | 'lighter';

const DESTINATIONS: PerpsReceiveDestination[] = ['hyperliquid', 'lighter'];

export const DEFAULT_PERPS_RECEIVE_DESTINATION: PerpsReceiveDestination =
  'hyperliquid';

/**
 * Display amounts from the deposit mock. This task does not read protocol
 * balances, so these stay constant until a later ticket wires them.
 */
const PLACEHOLDER_AVAILABLE_BALANCE: Record<PerpsReceiveDestination, string> = {
  hyperliquid: '$4,892.06',
  lighter: '$4,718.18',
};

// Bundled images resolve to a numeric asset id.
const HYPERLIQUID_BADGE_SRC = images.HYPE as number;

// The SVG import requires a `name` prop; the design-system badge does not pass one.
const LighterBadgeSrc = (props: SvgProps) => (
  <LighterLogo {...props} name="Lighter" />
);

const DESTINATION_NAME: Record<PerpsReceiveDestination, string> = {
  hyperliquid: 'Hyperliquid',
  lighter: 'Lighter',
};

function DestinationAvatar({
  destination,
  size = AvatarTokenSize.Md,
}: {
  destination: PerpsReceiveDestination;
  size?: AvatarTokenSize;
}) {
  return (
    <BadgeWrapper
      badge={
        <BadgeNetwork
          name={DESTINATION_NAME[destination]}
          src={
            destination === 'hyperliquid'
              ? HYPERLIQUID_BADGE_SRC
              : LighterBadgeSrc
          }
        />
      }
    >
      <AvatarToken
        name={USDC_SYMBOL}
        src={{ uri: USDC_TOKEN_ICON_URL }}
        size={size}
      />
    </BadgeWrapper>
  );
}

interface PerpsReceiveToRowProps {
  destination: PerpsReceiveDestination;
  onDestinationChange: (destination: PerpsReceiveDestination) => void;
}

export const PerpsReceiveToRow: React.FC<PerpsReceiveToRowProps> = ({
  destination,
  onDestinationChange,
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const providerFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const isVisible =
    isPerpsLighterConfirmationEnabled() &&
    isLighterProviderEnabled() &&
    providerFlagEnabled &&
    hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]);

  const closeSheet = useCallback(() => {
    setIsSheetVisible(false);
  }, []);

  const handleSelect = useCallback(
    (next: PerpsReceiveDestination) => {
      onDestinationChange(next);
      sheetRef.current?.onCloseBottomSheet();
      setIsSheetVisible(false);
    },
    [onDestinationChange],
  );

  if (!isVisible) {
    return null;
  }

  const rowLabel = strings('confirm.label.to');
  const selectedLabel = strings(`confirm.perps_receive_to.${destination}`);
  const selectedBalance = PLACEHOLDER_AVAILABLE_BALANCE[destination];

  return (
    <>
      <Box>
        <KeyValueSelect
          accessibilityLabel={`${rowLabel}, ${selectedLabel}, ${selectedBalance}`}
          keyLabel={rowLabel}
          onPress={() => setIsSheetVisible(true)}
          selectButtonProps={{}}
          testID={PerpsReceiveToSelectorsIDs.ROW}
          value={selectedLabel}
          valueStartAccessory={
            <DestinationAvatar
              destination={destination}
              size={AvatarTokenSize.Sm}
            />
          }
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="self-end pr-4"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {`(${selectedBalance})`}
        </Text>
      </Box>
      {isSheetVisible && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={closeSheet}
        >
          <Box twClassName="flex-1">
            <BottomSheet
              ref={sheetRef}
              testID={PerpsReceiveToSelectorsIDs.SHEET}
              onClose={closeSheet}
            >
              <BottomSheetHeader onClose={closeSheet}>
                {rowLabel}
              </BottomSheetHeader>
              <Box twClassName="px-4 pt-3 pb-2">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="uppercase"
                >
                  {strings('confirm.perps_receive_to.section')}
                </Text>
              </Box>
              <Box twClassName="px-4 pb-4" gap={2}>
                {DESTINATIONS.map((option) => {
                  const isSelected = option === destination;
                  return (
                    <ListItemSelect
                      key={option}
                      title={strings(`confirm.perps_receive_to.${option}`)}
                      titleEndAccessory={
                        option === DEFAULT_PERPS_RECEIVE_DESTINATION ? (
                          <Tag severity={TagSeverity.Neutral}>
                            {strings('confirm.perps_receive_to.default')}
                          </Tag>
                        ) : undefined
                      }
                      description={strings(
                        'confirm.perps_receive_to.available',
                        { amount: PLACEHOLDER_AVAILABLE_BALANCE[option] },
                      )}
                      startAccessory={
                        <DestinationAvatar destination={option} />
                      }
                      endAccessory={
                        <RadioButton
                          isChecked={isSelected}
                          isReadOnly
                          accessible={false}
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                          touchableOpacityProps={{
                            accessible: false,
                            accessibilityElementsHidden: true,
                            importantForAccessibility: 'no',
                          }}
                        />
                      }
                      isSelected={isSelected}
                      onPress={() => handleSelect(option)}
                      twClassName={`rounded-xl border bg-muted ${
                        isSelected ? 'border-default' : 'border-transparent'
                      }`}
                      testID={`${PerpsReceiveToSelectorsIDs.OPTION}-${option}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    />
                  );
                })}
              </Box>
            </BottomSheet>
          </Box>
        </Modal>
      )}
    </>
  );
};
