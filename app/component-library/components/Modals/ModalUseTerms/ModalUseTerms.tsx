import React, { useRef, useState } from 'react';
import { Modal, StyleSheet, View, ScrollView } from 'react-native';
import { useTheme } from '../../../../util/theme';

import { strings } from '../../../../../locales/i18n';

import Device from '../../../../util/device';
import { Colors } from '../../../../util/theme/models';
import { fontStyles } from '../../../../styles/common';
import ButtonIcon from '../../Buttons/Button/variants/ButtonIcon';
import { IconName } from '../../Icon';
import { ButtonVariants } from '../../Buttons/Button';
import ButtonPrimary from '../../Buttons/Button/variants/ButtonPrimary';
import Text from '../../Texts/Text';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import en from '../../../../../locales/languages/en';
import Checkbox from '../../Checkbox';

const screenHeight = Device.getDeviceHeight();
const maxSlideItemHeight = screenHeight - 200;
const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 32,
    },
    bodyContainer: { maxHeight: maxSlideItemHeight },
    termsAndConditionsContainer: { marginLeft: 16, marginRight: 32 },
    acceptTermsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginHorizontal: 16,
    },
    headerText: {
      ...fontStyles.bold,
      fontSize: 18,
      color: colors.text.default,
    },
    scrollToEndButton: {
      width: 32,
      height: 32,
      borderRadius: 32 / 2,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      position: 'absolute',
      bottom: 100,
      right: 32,
    },
    confirmButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    checkBox: { flex: 1 },
    checkBoxText: {
      ...fontStyles.bold,
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
    },
    acceptButton: { width: '100%', marginTop: 16 },
    scrollDownInfo: { marginVertical: 16 },
  });

const ModalUseTerms = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [isTermsSelected, setIsTermsSelected] = useState(false);
  const [isFloatingButton, setIsFloatingButtonBackground] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>Our Terms of Use have updated</Text>
    </View>
  );

  const scrollToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const renderScrollEndButton = () => (
    <View
      style={[
        styles.scrollToEndButton,
        // eslint-disable-next-line react-native/no-inline-styles
        !isFloatingButton && {
          display: 'none',
        },
      ]}
    >
      <ButtonIcon
        onPress={scrollToEnd}
        iconName={IconName.ArrowDownOutline}
        variant={ButtonVariants.Icon}
      />
    </View>
  );

  const handleSelect = () => {
    setIsTermsSelected(!isTermsSelected);
  };

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: any) => {
    const paddingToBottom = 20;

    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      setIsFloatingButtonBackground(false);
    } else {
      setIsFloatingButtonBackground(true);
    }
  };

  return (
    <Modal style={styles.screen}>
      {/*Add test ID for testing porposes */}
      <View style={styles.modal}>
        {renderHeader()}
        <View style={styles.bodyContainer}>
          <ScrollView
            ref={scrollRef}
            onScroll={({ nativeEvent }) => isCloseToBottom(nativeEvent)}
          >
            <View style={styles.termsAndConditionsContainer}>
              {Object.keys(en.terms_of_use).map((key) => (
                <Text key={key}>{strings(`terms_of_use.${key}`)}</Text>
              ))}
              <View style={styles.acceptTermsContainer}>
                <Checkbox
                  isSelected={isTermsSelected}
                  onPress={handleSelect}
                  style={styles.checkBox}
                />
                <Text style={styles.checkBoxText}>
                  I aggree to the Terms of Use, which apply to my use of
                  MetaMask and all of its features
                </Text>
              </View>
            </View>
          </ScrollView>
          {renderScrollEndButton()}
          <View style={styles.confirmButtonContainer}>
            <ButtonPrimary
              label="Accept"
              disabled={!isTermsSelected}
              style={styles.acceptButton}
            />
            <Text style={styles.scrollDownInfo}>
              Please scroll to read all sections
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalUseTerms;
