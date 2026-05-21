import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Modal, TouchableOpacity, View } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  BottomSheet,
  BottomSheetRef,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import moneyAccountImage from '../../../../../../images/money-account.png';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import PaymentMethodRow from '../../UI/payment-method-row/payment-method-row';
import styleSheet from './pay-from-row.styles';
import { useGlobalAccount } from './useGlobalAccount';
export type PayFromSource = 'global-account' | 'money-account';

interface PayFromOption {
  id: PayFromSource;
  title: string;
  icon: React.ReactElement;
  pillIcon: React.ReactElement;
  trailingElement?: React.ReactElement;
}

interface PayFromRowProps {
  value: PayFromSource;
  onChange: (value: PayFromSource) => void;
}

interface PayFromSourceSheetProps {
  visible: boolean;
  options: PayFromOption[];
  value: PayFromSource;
  onSelect: (value: PayFromSource) => void;
  onDismiss: () => void;
}

function PayFromSourceSheet({
  visible,
  options,
  value,
  onSelect,
  onDismiss,
}: PayFromSourceSheetProps) {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
      testID="pay-from-row-modal"
    >
      <View style={styles.modalRoot}>
        <BottomSheet
          ref={bottomSheetRef}
          keyboardAvoidingViewEnabled={false}
          onClose={onDismiss}
        >
          <HeaderCompactStandard
            title={strings('confirm.label.select_source')}
            onClose={handleClose}
          />
          <View style={styles.modalBody}>
            {options.map((option) => (
              <PaymentMethodRow
                key={option.id}
                id={option.id}
                icon={option.icon}
                title={option.title}
                isSelected={value === option.id}
                trailingElement={option.trailingElement}
                onPress={() => {
                  onSelect(option.id);
                  handleClose();
                }}
              />
            ))}
          </View>
        </BottomSheet>
      </View>
    </Modal>
  );
}

function usePayFromOptions(): PayFromOption[] {
  const {
    name: accountName,
    address: accountAddress,
    avatarVariant,
    formattedBalance,
  } = useGlobalAccount();
  const { totalFiatFormatted: moneyAccountBalance } = useMoneyAccountBalance();
  const { styles } = useStyles(styleSheet, {});

  return useMemo<PayFromOption[]>(
    () => [
      {
        id: 'global-account',
        title: accountName ?? '',
        icon: (
          <AvatarAccount
            variant={avatarVariant}
            address={accountAddress}
            size={AvatarAccountSize.Md}
          />
        ),
        pillIcon: (
          <AvatarAccount
            variant={avatarVariant}
            address={accountAddress}
            size={AvatarAccountSize.Sm}
          />
        ),
        trailingElement: formattedBalance ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {formattedBalance}
          </Text>
        ) : undefined,
      },
      {
        id: 'money-account',
        title: strings('confirm.label.money_account'),
        icon: (
          <Image source={moneyAccountImage} style={styles.moneyAccountIconMd} />
        ),
        pillIcon: (
          <Image source={moneyAccountImage} style={styles.moneyAccountIconSm} />
        ),
        trailingElement: moneyAccountBalance ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {moneyAccountBalance}
          </Text>
        ) : undefined,
      },
    ],
    [
      accountAddress,
      accountName,
      avatarVariant,
      formattedBalance,
      moneyAccountBalance,
      styles,
    ],
  );
}

export function PayFromRow({ value, onChange }: PayFromRowProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const options = usePayFromOptions();
  const selectedOption = options.find((opt) => opt.id === value) ?? options[0];

  const openModal = useCallback(() => setIsModalVisible(true), []);
  const handleDismiss = useCallback(() => setIsModalVisible(false), []);

  return (
    <View>
      <TouchableOpacity
        onPress={openModal}
        testID="pay-from-row-pill"
        style={styles.container}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('confirm.label.from')}
        </Text>
        <View style={styles.valueContainer}>
          {selectedOption.pillIcon}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            ellipsizeMode="middle"
            twClassName="shrink"
          >
            {selectedOption.title}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </View>
      </TouchableOpacity>
      <View style={styles.separator} />
      <PayFromSourceSheet
        visible={isModalVisible}
        options={options}
        value={value}
        onSelect={onChange}
        onDismiss={handleDismiss}
      />
    </View>
  );
}
