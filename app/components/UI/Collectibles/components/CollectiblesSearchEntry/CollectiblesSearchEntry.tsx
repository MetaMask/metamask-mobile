import React from 'react';
import { Pressable } from 'react-native';
import { Box, TextFieldSearch } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export default function CollectiblesSearchEntry({
  label,
  value,
  onChange,
  onSearch,
  testID,
  inputTestID,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  testID: string;
  inputTestID: string;
}) {
  const tw = useTailwind();
  return (
    <Pressable
      style={tw.style('flex-1 min-h-12')}
      onPress={onSearch}
      accessible={Boolean(onSearch)}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Box pointerEvents={onSearch ? 'none' : 'auto'}>
        <TextFieldSearch
          value={value}
          onChangeText={onChange}
          onPressClearButton={() => onChange('')}
          placeholder={label}
          inputAccessibilityLabel={label}
          inputProps={{ testID: inputTestID }}
          isReadOnly={Boolean(onSearch)}
          accessibilityElementsHidden={Boolean(onSearch)}
        />
      </Box>
    </Pressable>
  );
}
