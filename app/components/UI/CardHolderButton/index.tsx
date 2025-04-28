import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';

const createStyles = (colors: any) =>
  StyleSheet.create({
    cardHolderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.default,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginVertical: 8,
    },
    cardHolderText: {
      ...fontStyles.normal,
      color: colors.primary.inverse,
      fontSize: 14,
      marginLeft: 8,
    },
    cardIcon: {
      color: colors.primary.inverse,
    },
  });

interface Props {
  onPress?: () => void;
}

const CardHolderButton = ({ onPress }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isCardHolder, setIsCardHolder] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const selectedAddress = useSelector(
    (state: any) => state.engine.backgroundState.PreferencesController.selectedAddress
  );

  useEffect(() => {
    const checkCardHolder = async () => {
      try {
        if (!selectedAddress) return;
        
        setIsLoading(true);
        
        // Check if CardController exists and has isCardHolder method
        if (Engine.context.CardController && typeof Engine.context.CardController.isCardHolder === 'function') {
          const result = await Engine.context.CardController.isCardHolder(selectedAddress);
          setIsCardHolder(result);
        } else {
          // If CardController doesn't exist, log and hide the button
          Logger.log('CardController not available');
          setIsCardHolder(false);
        }
      } catch (error) {
        Logger.error(error instanceof Error ? error : new Error(String(error)));
        setIsCardHolder(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCardHolder();
  }, [selectedAddress]);

  if (isLoading || !isCardHolder) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.cardHolderButton} onPress={onPress}>
      <Icon name="credit-card" size={16} style={styles.cardIcon} />
      <Text style={styles.cardHolderText}>
        {strings('card_holder.view_card')}
      </Text>
    </TouchableOpacity>
  );
};

export default CardHolderButton; 