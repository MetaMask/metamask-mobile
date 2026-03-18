import React, { useEffect, useRef, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import {
  CaipAccountId,
  CaipChainId,
  parseCaipAccountId,
  parseCaipChainId,
  isCaipAccountId,
} from '@metamask/utils';
import { ViewStyle, TextInput, StyleSheet } from 'react-native';
import { Box } from '../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Label from '../../../component-library/components/Form/Label';
import TextField from '../../../component-library/components/Form/TextField';
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
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

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
  disabled?: boolean;
  error?: string;
}

const MatchedAccountInfo = ({
  label,
  displayAvatar,
  chainId,
  value,
  displayName,
  handleClear,
  disabled,
  error,
}: MatchedAccountInfoProps) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.muted,
      paddingHorizontal: 16,
      height: 48,
      opacity: disabled ? 0.5 : 1,
    },
    outerTextContainer: {
      flex: 1,
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
        testID="snap-ui-address-input__matched-account-info"
      >
        {displayAvatar && (
          <SnapUIAvatar address={`${chainId}:${value}`} size={AvatarSize.Sm} />
        )}
        <Box
          flexDirection={FlexDirection.Column}
          style={styles.outerTextContainer}
        >
          <Text variant={TextVariant.BodyMDMedium}>{displayName}</Text>
          <Text
            variant={TextVariant.BodyXS}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
        </Box>
        <ButtonIcon
          onPress={handleClear}
          iconName={IconName.Close}
          iconColor={IconColor.Info}
          isDisabled={disabled}
          style={styles.icon}
          testID="snap-ui-address-input__clear-button"
        />
      </Box>
      {error && (
        // eslint-disable-next-line react-native/no-inline-styles
        <HelpText severity={HelpTextSeverity.Error} style={{ marginTop: 4 }}>
          {error}
        </HelpText>
      )}
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

  /**
   * Parses the value to get the address.
   * If the value is a CAIP-10 account ID, it extracts the address otherwise returns the raw value.
   *
   * @param value - The value to parse.
   * @returns The address or the raw value.
   */
  const getParsedValue = (value?: string) => {
    if (!value) {
      return '';
    }

    /*
     * Safeguard against invalid CAIP-10 account ID.
     * We can't ensure that when we append the value to the chain ID
     * it will be a valid CAIP-10 account ID.
     */
    if (isCaipAccountId(value)) {
      const { address } = parseCaipAccountId(value as CaipAccountId);
      return address;
    }

    return value;
  };

  const [value, setValue] = useState(getParsedValue(initialValue));

  const displayName = useDisplayName({
    address: value,
    chain: {
      namespace,
      reference,
    },
    chainId,
  });

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setValue(getParsedValue(initialValue));
    }
  }, [initialValue]);

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
        disabled={disabled}
        error={error}
      />
    );
  }

  return (
    <Box style={style}>
      {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
      <TextField
        {...props}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        id={name}
        value={value}
        isDisabled={disabled}
        onChangeText={handleChange}
        testID={`${name}-snap-address-input`}
        startAccessory={
          displayAvatar && value && isCaipAccountId(`${chainId}:${value}`) ? (
            <SnapUIAvatar
              address={`${chainId}:${value}`}
              size={AvatarSize.Sm}
            />
          ) : null
        }
        endAccessory={
          value ? (
            <ButtonIcon
              onPress={handleClear}
              iconName={IconName.Close}
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Info}
              isDisabled={disabled}
              testID="snap-ui-address-input__clear-button"
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
