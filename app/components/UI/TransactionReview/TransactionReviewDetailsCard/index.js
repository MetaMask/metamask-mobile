import React, { Component } from 'react';

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';
import Feather from 'react-native-vector-icons/Feather';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import ConnectHeader from '../../ConnectHeader';
import formatNumber from '../../../../util/formatNumber';
import TransactionTypes from '../../../../core/TransactionTypes';
import { renderShortAddress } from '../../../../util/address';

const {
  ASSET: { ERC20 },
} = TransactionTypes;

const createStyles = (colors) =>
  StyleSheet.create({
    uppercase: {
      textTransform: 'capitalize',
    },
    viewData: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginTop: 20,
    },
    viewDataRow: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    viewDataTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
    },
    viewDataText: {
      marginTop: 20,
      color: colors.text.default,
    },
    viewDataArrow: {
      marginLeft: 'auto',
    },
    transactionDetails: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
    },
    transactionDetailsRow: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingVertical: 4,
    },
    transactionDetailsTextLeft: {
      ...fontStyles.thin,
      color: colors.text.default,
      fontSize: 14,
    },
    transactionDetailsTextRight: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
      textAlign: 'right',
      flexDirection: 'row',
      marginLeft: 'auto',
    },
    section: {
      minWidth: '100%',
      width: '100%',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    copyIcon: {
      marginLeft: 1,
      marginTop: 2,
    },
    address: {
      ...fontStyles.bold,
      color: colors.primary.default,
      marginHorizontal: 8,
      maxWidth: 120,
    },
  });

export default class TransactionReviewDetailsCard extends Component {
  static propTypes = {
    toggleViewDetails: PropTypes.func,
    copyContractAddress: PropTypes.func,
    toggleViewData: PropTypes.func,
    address: PropTypes.string,
    host: PropTypes.string,
    allowance: PropTypes.string,
    tokenSymbol: PropTypes.string,
    data: PropTypes.string,
    displayViewData: PropTypes.bool,
    method: PropTypes.string,
    nickname: PropTypes.string,
    nicknameExists: PropTypes.bool,
    tokenValue: PropTypes.string,
    tokenStandard: PropTypes.string,
    tokenName: PropTypes.string,
  };

  render() {
    const {
      toggleViewDetails,
      toggleViewData,
      copyContractAddress,
      address,
      host,
      allowance,
      tokenSymbol,
      data,
      method,
      displayViewData,
      nickname,
      nicknameExists,
      tokenValue,
      tokenName,
      tokenStandard,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.section}>
        <ConnectHeader
          action={toggleViewDetails}
          title={strings('spend_limit_edition.transaction_details')}
        />
        <View style={styles.transactionDetails}>
          {host ? (
            <View style={styles.transactionDetailsRow}>
              <Text style={styles.transactionDetailsTextLeft}>
                {strings('spend_limit_edition.site_url')}
              </Text>
              <Text style={styles.transactionDetailsTextRight}>{host}</Text>
            </View>
          ) : null}
          <View style={styles.transactionDetailsRow}>
            <Text style={styles.transactionDetailsTextLeft}>
              {strings('spend_limit_edition.contract_address')}
            </Text>
            <View style={styles.transactionDetailsTextRight}>
              {nicknameExists ? (
                <Text numberOfLines={1} style={styles.address}>
                  {nickname}
                </Text>
              ) : (
                <Text style={styles.address}>
                  {renderShortAddress(address)}
                </Text>
              )}
              <Feather
                name="copy"
                size={16}
                color={colors.primary.default}
                style={styles.copyIcon}
                onPress={() => copyContractAddress(address)}
              />
            </View>
          </View>
          <View style={styles.transactionDetailsRow}>
            <Text style={styles.transactionDetailsTextLeft}>
              {tokenStandard === ERC20
                ? strings('spend_limit_edition.spending_cap')
                : strings('spend_limit_edition.approve_asset')}
            </Text>
            <Text style={styles.transactionDetailsTextRight}>
              {tokenStandard === ERC20
                ? `${formatNumber(allowance)} ${tokenSymbol}`
                : `${tokenName} (#${tokenValue})`}
            </Text>
          </View>
        </View>
        <View style={styles.viewData}>
          <TouchableOpacity style={styles.viewDataRow} onPress={toggleViewData}>
            <Text style={styles.viewDataTitle}>
              {strings('spend_limit_edition.view_data')}
            </Text>
            <View style={styles.viewDataArrow}>
              <IonicIcon
                name={`ios-arrow-${displayViewData ? 'up' : 'down'}`}
                size={16}
                color={colors.icon.default}
              />
            </View>
          </TouchableOpacity>
          {displayViewData ? (
            <>
              <Text style={[styles.viewDataText, styles.uppercase]}>
                {strings('spend_limit_edition.function')}: {method}
              </Text>
              <Text style={styles.viewDataText}>{data}</Text>
            </>
          ) : null}
        </View>
      </View>
    );
  }
}

TransactionReviewDetailsCard.contextType = ThemeContext;
