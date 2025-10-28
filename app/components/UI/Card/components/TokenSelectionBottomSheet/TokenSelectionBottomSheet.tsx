import React, { useCallback } from 'react';
import { FlatList, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import {
  useSupportedTokens,
  SupportedTokenWithChain,
} from '../../hooks/useSupportedTokens';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Modal from 'react-native-modal';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { strings } from '../../../../../../locales/i18n';
import { toHexadecimal } from '../../../../../util/number';
import createStyles from './TokenSelectionBottomSheet.styles';

interface TokenSelectionBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedToken: SupportedTokenWithChain | null;
  onTokenSelect: (token: SupportedTokenWithChain) => void;
}

const TokenSelectionBottomSheet: React.FC<TokenSelectionBottomSheetProps> = ({
  isVisible,
  onClose,
  selectedToken,
  onTokenSelect,
}) => {
  const { supportedTokens } = useSupportedTokens();
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleTokenPress = useCallback(
    (token: SupportedTokenWithChain) => {
      onTokenSelect(token);
      onClose();
    },
    [onTokenSelect, onClose],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyMD} style={styles.emptyText}>
          {strings('card.no_tokens_found')}
        </Text>
      </View>
    ),
    [styles],
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name={IconName.Close} size={IconSize.Md} />
          </TouchableOpacity>
          <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
            {strings('card.select_asset')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={supportedTokens}
          keyExtractor={(item) =>
            `${item.chainId}-${item.address || item.symbol}`
          }
          renderItem={({ item }) => {
            // Convert CAIP chain ID to hex format for buildTokenIconUrl
            const hexChainId = item.chainId.startsWith('eip155:')
              ? `0x${toHexadecimal(item.chainId.replace('eip155:', ''))}`
              : item.chainId;

            const iconUrl = buildTokenIconUrl(hexChainId, item.address || '');
            const isSelected =
              selectedToken?.address === item.address &&
              selectedToken?.chainId === item.chainId;

            return (
              <TouchableOpacity
                style={[
                  styles.tokenItem,
                  isSelected && styles.selectedTokenItem,
                ]}
                onPress={() => handleTokenPress(item)}
              >
                <AvatarToken
                  name={item.symbol || ''}
                  imageSource={iconUrl ? { uri: iconUrl } : undefined}
                  size={AvatarSize.Md}
                  style={styles.tokenIcon}
                />
                <View style={styles.tokenInfo}>
                  <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
                    {item.symbol}
                  </Text>
                  <Text variant={TextVariant.BodySM} style={styles.chainName}>
                    {item.chainName}
                  </Text>
                </View>
                <View style={styles.tokenStatus}>
                  <Text variant={TextVariant.BodySM} style={styles.statusText}>
                    {isSelected ? 'Enabled' : 'Not enabled'}
                  </Text>
                  <Text variant={TextVariant.BodySM} style={styles.balanceText}>
                    $0.00 USD
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          style={styles.tokenList}
          contentContainerStyle={styles.tokenListContent}
          ListEmptyComponent={renderEmptyComponent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator
        />
      </SafeAreaView>
    </Modal>
  );
};

export default TokenSelectionBottomSheet;
