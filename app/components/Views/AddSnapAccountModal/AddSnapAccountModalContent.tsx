// Third party dependencies
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

// External dependencies
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies
import styleSheet from './AddSnapAccountModal.styles';

interface AddSnapAccountModalContentProps {
  suggestedName: string;
}

const AddSnapAccountModalContent: React.FC<AddSnapAccountModalContentProps> = ({
  suggestedName,
}) => {
  const [accountName, setAccountName] = useState(suggestedName);
  const [error, setError] = useState('');
  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    setAccountName(suggestedName);
  }, [suggestedName]);

  const onChangeName = (name: string) => {
    setAccountName(name);
    setError('');
  };

  return (
    <View style={styles.inputsContainer}>
      <View style={styles.inputContainer}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('address_book.name')}
        </Text>
        <TextField value={accountName} onChangeText={onChangeName} autoFocus />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.inputContainer}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('address_book.address')}
        </Text>
      </View>
    </View>
  );
};

export default AddSnapAccountModalContent;
