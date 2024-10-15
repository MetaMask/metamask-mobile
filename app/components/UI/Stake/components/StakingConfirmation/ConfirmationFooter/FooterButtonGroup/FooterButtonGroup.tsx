import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './FooterButtonGroup.styles';
import { StakeSdk, ProtocolType } from '@metamask/stake-sdk';
import { useSelector } from 'react-redux';
import { captureException } from '@sentry/react-native';
import {
  selectChainId,
  selectProviderConfig,
  selectRpcUrl,
} from '../../../../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../../../../selectors/accountsController';
import { BigNumber, Contract, ethers } from 'ethers';
import Engine from '../../../../../../../core/Engine';
import { NetworkController } from '@metamask/network-controller';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import contractJson1 from './abi1.json';
import { addHexPrefix, BN } from 'ethereumjs-util';
import { query, toHex } from '@metamask/controller-utils';
import {
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { addTransaction } from '../../../../../../../util/transaction-controller';
import TransactionTypes from '../../../../../../../core/TransactionTypes';
import { RootState } from '../../../../../BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { getProviderByChainId } from '../../../../../../../util/notifications/methods';
import { JsonRpcProvider, Web3Provider } from '@ethersproject/providers';

const PoolStakingContract = {
  // Mainnet
  1: {
    address: '0x4fef9d741011476750a243ac70b9789a63dd47df',
    abi: contractJson1.abi,
  },
  // Holesky
  17000: {
    address: '0x37bf0883c27365cffcd0c4202918df930989891f',
    abi: contractJson1.abi,
  },
};

const initPoolStakingContract = (provider: Web3Provider): Contract =>
  new ethers.Contract(
    PoolStakingContract['17000'].address,
    PoolStakingContract['17000'].abi,
    provider,
  );

interface FooterButtonGroupProps {
  value: string; // deposit, unstake, and claim value
}

// TODO: Trigger transaction in @transaction/controller using addTransaction() method.
const FooterButtonGroup = ({ value }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const chainId = useSelector(selectChainId);
  console.log('chainId', chainId);
  const activeAccount = useSelector(selectSelectedInternalAccount);

  // const MOCK_ETH_TO_STAKE = '0.0041'; // 0.02043 ETH
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(chainId);

  console.log('networkClientId: ', networkClientId);

  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  console.log('provider: ', provider);

  const web3Provider = new Web3Provider(provider);

  const poolStakingContract = useMemo(
    () => initPoolStakingContract(web3Provider),
    [],
  );

  const stakeSdk = useMemo(
    () =>
      StakeSdk.create({
        chainId: 17000,
        verbose: true,
        type: ProtocolType.POOLED,
      }),
    [],
  );

  const estimateDepositGas = async (
    depositValue: string,
    receiver: string,
    referrer: string,
  ): Promise<number> => {
    let estimatedGas;
    try {
      const deposit = ethers.utils.parseEther(depositValue);
      estimatedGas = await poolStakingContract.estimateGas.deposit(
        receiver,
        referrer,
        { value: deposit.toString(), from: receiver },
      );
    } catch (e) {
      const errorMessage = (e as Error).message;
      captureException(
        new Error(
          `Gas estimation failed for Pooled Staking contract with message: ${errorMessage}`,
        ),
      );
    }
    if (BigNumber.isBigNumber(estimatedGas)) return estimatedGas.toNumber();
    else
      throw Error(
        `Unexpected deposit gas estimation output from Pooled Staking contract with value: ${estimatedGas}`,
      );
  };

  const handleStake = async () => {
    console.log('activeAccount.address: ', activeAccount?.address);
    if (!activeAccount?.address) return;

    // Working
    const receiver = activeAccount.address;
    const referrer = ZERO_ADDRESS;
    // // Now try to estimate gas
    const gasEstimate = await estimateDepositGas(value, receiver, referrer);

    console.log('gasEstimate: ', gasEstimate);

    const encodedStakeTxData =
      await stakeSdk.pooledService.encodeDepositTransactionData(
        value,
        receiver,
        referrer,
        { gasLimit: parseInt(gasEstimate.toString()), gasBufferPct: 10 }, // 10% buffer
      );
    console.log('encodedStakeTxData: ', encodedStakeTxData);

    const tx: TransactionParams = {
      to: PoolStakingContract['17000'].address,
      from: activeAccount.address,
      chainId: `0x${17000}`,
      data: encodedStakeTxData.data,
      value: toHex(ethers.utils.parseEther(value).toString()),
      // type: TransactionTypes.STAKING.STAKE,
    };

    const txRes = await addTransaction(tx, {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      origin: process.env.MM_FOX_CODE,
    });

    console.log('txRes: ', txRes);
  };

  return (
    <View style={styles.footerContainer}>
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('stake.cancel')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Secondary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleGoBack}
      />
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
            {strings('stake.confirm')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        // TODO: Replace with actual stake confirmation flow
        onPress={handleStake}
      />
    </View>
  );
};

export default FooterButtonGroup;
