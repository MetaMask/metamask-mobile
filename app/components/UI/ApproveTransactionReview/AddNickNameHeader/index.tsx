import React from 'react';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';

interface HeaderProps {
  closeModal: () => void;
  nicknameExists: boolean;
  headerWrapperStyle?: any;
  headerTextStyle?: any;
  iconStyle?: any;
}

const Header = (props: HeaderProps) => {
  const {
    closeModal,
    nicknameExists,
    headerWrapperStyle,
    headerTextStyle,
    iconStyle,
  } = props;

  return (
    <View style={headerWrapperStyle}>
      <Text style={headerTextStyle}>
        {nicknameExists
          ? strings('nickname.edit_nickname')
          : strings('nickname.add_nickname')}
      </Text>
      <AntDesignIcon
        name={'close'}
        size={20}
        style={iconStyle}
        onPress={() => closeModal()}
      />
    </View>
  );
};

export default Header;
