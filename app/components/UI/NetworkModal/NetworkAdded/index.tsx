import React from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { NetworkAddedBottomSheetSelectorsIDs } from '../NetworkAddedBottomSheet.testIds';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button/Button.types';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = () =>
  StyleSheet.create({
    header: {
      padding: 0,
    },
    content: {
      paddingVertical: 16,
    },
    buttonView: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    base: {
      padding: 16,
    },
  });

interface NetworkAddedProps {
  nickname: string;
  closeModal: () => void;
  switchNetwork: () => void;
}

const NetworkAdded = (props: NetworkAddedProps) => {
  const { nickname, closeModal, switchNetwork } = props;
  const styles = createStyles();

  const buttonProps: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      size: ButtonSize.Lg,
      onPress: closeModal,
      label: strings('networks.close'),
      testID: NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: switchNetwork,
      label: strings('networks.switch_network'),
      testID: NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    },
  ];
  return (
    <View style={styles.base}>
      <BottomSheetHeader style={styles.header}>
        {strings('networks.new_network')}
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text>
          <Text variant={TextVariant.BodyMDBold}>
            {`"${strings('networks.network_name', {
              networkName: nickname ?? '',
            })}"`}
          </Text>
          <Text variant={TextVariant.BodyMD}>
            {strings('networks.network_added')}
          </Text>
        </Text>
      </View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={buttonProps}
      />
    </View>
  );
};

export default NetworkAdded;
