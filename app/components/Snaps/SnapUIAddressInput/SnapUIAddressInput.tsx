import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import {
  CaipAccountId,
  CaipChainId,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import { ViewStyle, TextInput, StyleSheet } from 'react-native';
import { Box } from '../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Label from '../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { SnapUIAvatar } from '../SnapUIAvatar/SnapUIAvatar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { useDisplayName } from '../SnapUIAddress/useDisplayName';
import { AlignItems, FlexDirection } from '../../UI/Box/box.types';
import { useTheme } from '../../../util/theme';

export interface SnapUIAddressInputProps {
  name: string;
  form?: string;
  label?: string;
  error?: string;
  chainId: CaipChainId;
  displayAvatar?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
  placeholder?: string;
}

interface MatchedAccountInfoProps {
  label?: string;
  displayAvatar?: boolean;
  chainId: CaipChainId;
  value: string;
  displayName: string;
  handleClear: () => void;
}

const MatchedAccountInfo = ({
  label,
  displayAvatar,
  chainId,
  value,
  displayName,
  handleClear,
}: MatchedAccountInfoProps) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.muted,
      paddingHorizontal: 16,
      height: 48,
    },
    outerTextContainer: {
      flex: 1,
    },
    text: {
      fontWeight: '500',
    },
    icon: {
      flexShrink: 0,
    },
  });
  return (
    <Box flexDirection={FlexDirection.Column}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <Box
        backgroundColor={colors.background.default}
        alignItems={AlignItems.center}
        flexDirection={FlexDirection.Row}
        gap={8}
        style={styles.container}
      >
        {displayAvatar && (
          <SnapUIAvatar address={`${chainId}:${value}`} size="sm" />
        )}
        <Box
          flexDirection={FlexDirection.Column}
          style={styles.outerTextContainer}
        >
          <Text style={styles.text}>{displayName}</Text>
          <Text variant={TextVariant.BodyXS} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
        </Box>
        <ButtonIcon
          onPress={handleClear}
          iconName={IconName.Close}
          iconColor={IconColor.Info}
          style={styles.icon}
        />
      </Box>
    </Box>
  );
};

export const SnapUIAddressInput = ({
  name,
  form,
  label,
  error,
  chainId,
  displayAvatar = true,
  style,
  disabled,
  ...props
}: SnapUIAddressInputProps) => {
  const { handleInputChange, getValue, focusedInput, setCurrentFocusedInput } =
    useSnapInterfaceContext();

  const inputRef = useRef<TextInput>(null);

  const initialValue = getValue(name, form) as string;
  const { namespace, reference } = parseCaipChainId(chainId);

  const [value, setValue] = useState(
    initialValue
      ? parseCaipAccountId(initialValue as CaipAccountId).address
      : '',
  );

  const displayName = useDisplayName({
    address: value,
    chain: {
      namespace,
      reference,
    },
    chainId,
  });

  const textFieldStyle = StyleSheet.create({
    textField: {
      borderRadius: 8,
    },
  });

  /*
   * Focus input if the last focused input was this input
   * This avoids loosing the focus when the UI is re-rendered
   */
  useEffect(() => {
    if (inputRef.current && focusedInput === name) {
      inputRef.current.focus();
    }
  }, [inputRef, name, focusedInput]);

  const handleChange = (text: string) => {
    setValue(text);
    const newValue = text ? `${chainId}:${text}` : '';
    handleInputChange(name, newValue, form);
  };

  const handleFocus = () => setCurrentFocusedInput(name);
  const handleBlur = () => setCurrentFocusedInput(null);

  const handleClear = () => {
    setValue('');
    handleInputChange(name, '', form);
  };

  if (displayName) {
    return (
      <MatchedAccountInfo
        label={label}
        displayAvatar={displayAvatar}
        chainId={chainId}
        value={value}
        displayName={displayName}
        handleClear={handleClear}
      />
    );
  }

  return (
    <Box style={style}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TextField
        {...props}
        size={TextFieldSize.Lg}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        value={value}
        isDisabled={disabled}
        onChangeText={handleChange}
        style={textFieldStyle.textField}
        startAccessory={
          displayAvatar && value ? (
            <SnapUIAvatar address={`${chainId}:${value}`} size="sm" />
          ) : null
        }
        endAccessory={
          value ? (
            <ButtonIcon
              onPress={handleClear}
              iconName={IconName.Close}
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Info}
            />
          ) : null
        }
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error && (
        // eslint-disable-next-line react-native/no-inline-styles
        <HelpText severity={HelpTextSeverity.Error} style={{ marginTop: 4 }}>
          {error}
        </HelpText>
      )}
    </Box>
  );
};
