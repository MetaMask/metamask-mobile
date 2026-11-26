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
import { isLighterProviderEnabled } from '../../../../../UI/Perps/utils/lighterFeatureFlags';
import { PerpsWithdrawFromSelectorsIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { usePerpsProviderBalance } from '../usePerpsProviderBalance';

export type PerpsWithdrawSource = 'hyperliquid' | 'lighter';

const SOURCES: PerpsWithdrawSource[] = ['hyperliquid', 'lighter'];

export const DEFAULT_PERPS_WITHDRAW_SOURCE: PerpsWithdrawSource = 'hyperliquid';

// Bundled images resolve to a numeric asset id.
const HYPERLIQUID_BADGE_SRC = images.HYPE as number;

// The SVG import requires a `name` prop; the design-system badge does not pass one.
const LighterBadgeSrc = (props: SvgProps) => (
  <LighterLogo {...props} name="Lighter" />
);

const SOURCE_NAME: Record<PerpsWithdrawSource, string> = {
  hyperliquid: 'Hyperliquid',
  lighter: 'Lighter',
};

function SourceAvatar({
  source,
  size = AvatarTokenSize.Md,
}: {
  source: PerpsWithdrawSource;
  size?: AvatarTokenSize;
}) {
  return (
    <BadgeWrapper
      badge={
        <BadgeNetwork
          name={SOURCE_NAME[source]}
          src={
            source === 'hyperliquid' ? HYPERLIQUID_BADGE_SRC : LighterBadgeSrc
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

interface PerpsWithdrawFromRowProps {
  source: PerpsWithdrawSource;
  onSourceChange: (source: PerpsWithdrawSource) => void;
}

// The balance hook needs `PerpsStreamProvider`, which only the Perps stack
// mounts, so it must not run on custom-amount screens where the row is hidden.
const PerpsWithdrawFromSelect: React.FC<PerpsWithdrawFromRowProps> = ({
  source,
  onSourceChange,
}) => {
  const providerBalance = usePerpsProviderBalance();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const closeSheet = useCallback(() => {
    setIsSheetVisible(false);
  }, []);

  const handleSelect = useCallback(
    (next: PerpsWithdrawSource) => {
      onSourceChange(next);
      sheetRef.current?.onCloseBottomSheet();
      setIsSheetVisible(false);
    },
    [onSourceChange],
  );

  const rowLabel = strings('confirm.label.from');
  const selectedLabel = strings(`confirm.perps_withdraw_from.${source}`);
  const selectedBalance = providerBalance[source];

  return (
    <>
      <Box twClassName="-mx-2">
        <KeyValueSelect
          accessibilityLabel={`${rowLabel}, ${selectedLabel}, ${selectedBalance}`}
          keyLabel={rowLabel}
          onPress={() => setIsSheetVisible(true)}
          selectButtonProps={{ placeholder: selectedLabel }}
          testID={PerpsWithdrawFromSelectorsIDs.ROW}
          value={selectedLabel}
          valueStartAccessory={
            <SourceAvatar source={source} size={AvatarTokenSize.Sm} />
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
              testID={PerpsWithdrawFromSelectorsIDs.SHEET}
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
                  {strings('confirm.perps_withdraw_from.section')}
                </Text>
              </Box>
              <Box twClassName="px-4 pb-4" gap={2}>
                {SOURCES.map((option) => {
                  const isSelected = option === source;
                  return (
                    <ListItemSelect
                      key={option}
                      title={strings(`confirm.perps_withdraw_from.${option}`)}
                      titleEndAccessory={
                        option === DEFAULT_PERPS_WITHDRAW_SOURCE ? (
                          <Tag severity={TagSeverity.Neutral}>
                            {strings('confirm.perps_withdraw_from.default')}
                          </Tag>
                        ) : undefined
                      }
                      description={strings(
                        'confirm.perps_withdraw_from.available',
                        { amount: providerBalance[option] },
                      )}
                      startAccessory={<SourceAvatar source={option} />}
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
                      testID={`${PerpsWithdrawFromSelectorsIDs.OPTION}-${option}`}
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

/**
 * From selector on the Perps withdraw amount screen. Choosing a source is
 * local UI: it does not write Redux, call a controller, or change the
 * withdrawal request.
 */
export const PerpsWithdrawFromRow: React.FC<PerpsWithdrawFromRowProps> = ({
  source,
  onSourceChange,
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const providerFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );

  const isVisible =
    isLighterProviderEnabled() &&
    providerFlagEnabled &&
    hasTransactionType(transactionMeta, [
      TransactionType.perpsWithdraw,
      TransactionType.perpsLighterWithdraw,
    ]);

  if (!isVisible) {
    return null;
  }

  return (
    <PerpsWithdrawFromSelect source={source} onSourceChange={onSourceChange} />
  );
};
