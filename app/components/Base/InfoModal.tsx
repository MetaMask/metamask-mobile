import React from 'react';
import { StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Text from './Text';
import Title from './Title';
import { useTheme } from '../../util/theme';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors'], shadows: Theme['shadows']) =>
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

interface InfoModalProps {
  isVisible: boolean | undefined;
  title?: React.ReactNode;
  body?: React.ReactNode;
  toggleModal: () => void;
  propagateSwipe?: boolean;
  message?: string;
  urlText?: string;
  url?: () => void;
  testID?: string;
}

interface CloseButtonProps {
  onPress: () => void;
  style: {
    closeIcon: object;
  };
}

const CloseButton: React.FC<CloseButtonProps> = ({ onPress, style }) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
  >
    <IonicIcon name="close" style={style.closeIcon} size={30} />
  </TouchableOpacity>
);

interface InfoViewProps {
  message?: string;
  urlText?: string;
  url?: () => void;
  onClose: () => void;
  style: {
    infoContainer: object;
    messageLimit: object;
    closeIcon: object;
  };
}

const InfoView: React.FC<InfoViewProps> = ({
  message,
  urlText,
  url,
  onClose,
  style,
}) => {
  if (!message) {
    return <CloseButton onPress={onClose} style={style} />;
  }

  return (
    <View style={style.infoContainer}>
      <Text style={style.messageLimit}>
        <Text>{message} </Text>
        {urlText && (
          <Text link onPress={url}>
            {urlText}
          </Text>
        )}
      </Text>
      <CloseButton onPress={onClose} style={style} />
    </View>
  );
};

function InfoModal({
  title,
  body,
  isVisible,
  toggleModal,
  message,
  propagateSwipe,
  urlText,
  url,
  testID,
}: InfoModalProps) {
  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

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
      testID={testID}
    >
      <SafeAreaView style={styles.modalView}>
        <View style={styles.title}>
          {title && <Title>{title}</Title>}
          <InfoView
            message={message}
            urlText={urlText}
            url={url}
            onClose={toggleModal}
            style={styles}
          />
        </View>
        {body && <View style={styles.body}>{body}</View>}
      </SafeAreaView>
    </Modal>
  );
}

export default InfoModal;
