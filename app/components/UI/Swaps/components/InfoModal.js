import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors, shadows) =>
  StyleSheet.create({
    modalView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 50,
      borderRadius: 10,
      ...shadows.size.sm,
      elevation: 11,
    },
    modal: {
      margin: 0,
      width: '100%',
      padding: 25,
    },
    title: {
      width: '100%',
      paddingVertical: 15,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: colors.text.default,
    },
    closeIcon: {
      color: colors.text.default,
    },
    body: {
      width: '100%',
      paddingBottom: 5,
      marginBottom: 15,
      paddingHorizontal: 20,
    },
    messageLimit: {
      width: '80%',
    },
    infoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
  });

function InfoModal({
  title,
  body,
  isVisible,
  toggleModal,
  message,
  propagateSwipe,
  urlText,
  url,
}) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  const CloseButton = () => (
    <TouchableOpacity
      onPress={toggleModal}
      hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
    >
      <IonicIcon name="ios-close" style={styles.closeIcon} size={30} />
    </TouchableOpacity>
  );

  const InfoView = () => {
    if (!message) {
      return <CloseButton />;
    }

    return (
      <View style={styles.infoContainer}>
        <Text style={styles.messageLimit}>
          <Text>{message} </Text>
          {urlText && (
            <Text link onPress={url}>
              {urlText}
            </Text>
          )}
        </Text>
        <CloseButton />
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={toggleModal}
      onBackButtonPress={toggleModal}
      onSwipeComplete={toggleModal}
      swipeDirection={'down'}
      style={styles.modal}
      propagateSwipe={propagateSwipe}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <SafeAreaView style={styles.modalView}>
        <View style={styles.title}>
          {title && <Title>{title}</Title>}
          <InfoView />
        </View>
        {body && <View style={styles.body}>{body}</View>}
      </SafeAreaView>
    </Modal>
  );
}
InfoModal.propTypes = {
  isVisible: PropTypes.bool,
  title: PropTypes.node,
  body: PropTypes.node,
  toggleModal: PropTypes.func,
  propagateSwipe: PropTypes.bool,
  message: PropTypes.string,
  urlText: PropTypes.string,
  url: PropTypes.func,
};

export default InfoModal;
