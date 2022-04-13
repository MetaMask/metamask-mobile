/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
	ScrollView,
	SafeAreaView,
	ActivityIndicator,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	FlatList,
	InteractionManager,
	TouchableOpacity,
} from 'react-native';
import Modal from 'react-native-modal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/controllers';
import TransactionActionModal from '../TransactionActionModal';
import TransactionElement from '../TransactionElement';
import UpdateEIP1559Tx from '../UpdateEIP1559Tx';
import RetryModal from './RetryModal';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import Engine from '../../../core/Engine';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../constants/network';
import { strings } from '../../../../locales/i18n';
import { isQRHardwareAccount } from '../../../util/address';
import Device from '../../../util/device';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../util/etherscan';
import Logger from '../../../util/Logger';
import { renderFromWei } from '../../../util/number';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../util/networks';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { baseStyles } from '../../../styles/common';
import createStyles from './styles';
import { IQRState } from '../QRHardware/types';

const ROW_HEIGHT = (Device.isIos() ? 95 : 100) + StyleSheet.hairlineWidth;

interface ITransactionsProps {
	transactions: any[];
	loading: boolean;
	navigation?: any;
	close?: any;
	assetSymbol?: string;
	submittedTransactions?: any[];
	confirmedTransactions?: any[];
	onRefSet?: any;
	header?: any;
	headerHeight?: any;
	QRState?: IQRState;
	isSigningQRObject?: boolean;
	isSyncingQRHardware?: boolean;
}

const Transactions = ({
	navigation,
	close,
	loading,
	isSigningQRObject,
	assetSymbol,
	transactions,
	submittedTransactions,
	confirmedTransactions,
	onRefSet,
	header,
	headerHeight = 0,
}: ITransactionsProps) => {
	// Map of accounts to information objects including balances.
	const accounts = useSelector((state: any) => state.engine.backgroundState.AccountTrackerController.accounts);
	// A string that represents the selected address
	const selectedAddress = useSelector<any, string>(
		(state: any) => state.engine.backgroundState.PreferencesController.selectedAddress
	);
	// Frequent RPC list from PreferencesController
	const frequentRpcList = useSelector(
		(state: any) => state.engine.backgroundState.PreferencesController.frequentRpcList
	);
	// Object representing the selected network
	const network = useSelector((state: any) => state.engine.backgroundState.NetworkController);
	// Indicates whether third party API mode is enabled
	const thirdPartyApiMode = useSelector((state: any) => state.privacy.thirdPartyApiMode);

	const [mounted, setMounted] = useState<boolean>(false);
	const [ready, setReady] = useState<boolean>(false);
	const [refreshing, setRefreshing] = useState<boolean>(false);
	const [cancelIsOpen, setCancelIsOpen] = useState<boolean>(false);
	const [cancel1559IsOpen, setCancel1559IsOpen] = useState<boolean>(false);
	const [cancelConfirmDisabled, setCancelConfirmDisabled] = useState<boolean>(false);
	const [speedUpIsOpen, setSpeedUpIsOpen] = useState<boolean>(false);
	const [speedUp1559IsOpen, setSpeedUp1559IsOpen] = useState<boolean>(false);
	const [retryIsOpen, setRetryIsOpen] = useState<boolean>(false);
	const [speedUpConfirmDisabled, setSpeedUpConfirmDisabled] = useState<boolean>(false);
	const [rpcBlockExplorer, setRpcBlockExplorer] = useState<string | undefined>(undefined);
	const [existingGas, setExistingGas] = useState<any>();
	const [existingTx, setExistingTx] = useState<any>();
	const [cancelTxId, setCancelTxId] = useState(undefined);
	const [speedUpTxId, setSpeedUpTxId] = useState(undefined);
	const [isQRHardware, setIsQRHardware] = useState<boolean>(false);
	const flatListRef = React.createRef<FlatList<any>>();

	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);

	useEffect(() => {
		setMounted(true);
		setTimeout(() => {
			mounted && setReady(true);
			onRefSet?.(flatListRef);
		}, 100);

		const {
			provider: { rpcTarget, type },
		} = network;

		const blockExplorer =
			type === RPC ? findBlockExplorerForRpc(rpcTarget, frequentRpcList) || NO_RPC_BLOCK_EXPLORER : undefined;
		setRpcBlockExplorer(blockExplorer);
		setIsQRHardware(isQRHardwareAccount(selectedAddress));

		return () => {
			setMounted(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mounted]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		const { refreshTransactionHistory } = Engine;
		thirdPartyApiMode && (await refreshTransactionHistory());
		setRefreshing(false);
	}, [thirdPartyApiMode]);

	const renderLoader = () => (
		<View style={styles.emptyContainer}>
			<ActivityIndicator style={styles.loader} size="small" />
		</View>
	);

	const renderEmpty = () => (
		<ScrollView
			contentContainerStyle={styles.emptyContainer}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			{header || null}
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	const viewOnBlockExplore = () => {
		const {
			provider: { type, chainId },
		} = network;
		try {
			let url;
			let title;
			if (type === RPC && rpcBlockExplorer) {
				url = `${rpcBlockExplorer}/address/${selectedAddress}`;
				title = new URL(rpcBlockExplorer).hostname;
			} else {
				const networkResult = getNetworkTypeById(chainId);
				url = getEtherscanAddressUrl(networkResult, selectedAddress);
				title = getEtherscanBaseUrl(networkResult).replace('https://', '');
			}
			navigation.push('Webview', {
				screen: 'SimpleWebview',
				params: {
					url,
					title,
				},
			});
			close?.();
		} catch (e: any) {
			Logger.error(e, { message: `can't get a block explorer link for network `, network });
		}
	};

	const renderViewMore = () => (
		<View style={styles.viewMoreBody}>
			<TouchableOpacity onPress={viewOnBlockExplore}>
				<Text style={styles.viewOnEtherscan}>
					{(rpcBlockExplorer &&
						`${strings('transactions.view_full_history_on')} ${getBlockExplorerName(rpcBlockExplorer)}`) ||
						strings('transactions.view_full_history_on_etherscan')}
				</Text>
			</TouchableOpacity>
		</View>
	);

	const getItemLayout = (_: any, index: number) => ({
		length: ROW_HEIGHT,
		offset: headerHeight + ROW_HEIGHT * index,
		index,
	});

	const keyExtractor = (item: any) => item.id.toString();

	const onSpeedUpAction = (speedUpAction: boolean, gas: any, tx: any) => {
		setExistingGas(gas);
		setSpeedUpTxId(tx.id);
		setExistingTx(tx);
		if (gas.isEIP1559Transaction) {
			setSpeedUp1559IsOpen(speedUpAction);
		} else {
			const isValidBalance = validateTransactionActionBalance(tx, SPEED_UP_RATE.toString(), accounts);
			setSpeedUpConfirmDisabled(!!isValidBalance);
			setSpeedUpIsOpen(speedUpAction);
		}
	};

	const onSpeedUpCompleted = useCallback(() => {
		setSpeedUp1559IsOpen(false);
		setSpeedUpIsOpen(false);
		setExistingGas(undefined);
		setSpeedUpTxId(undefined);
		setExistingTx(undefined);
	}, []);

	const onCancelAction = useCallback(
		(cancelAction, gas, tx) => {
			setExistingGas(gas);
			setCancelTxId(tx.id);
			setExistingTx(tx);

			if (gas.isEIP1559Transaction) {
				setCancel1559IsOpen(cancelAction);
			} else {
				const isValidBalance = validateTransactionActionBalance(tx, CANCEL_RATE.toString(), accounts);
				setCancelConfirmDisabled(!!isValidBalance);
				setCancelIsOpen(cancelAction);
			}
		},
		[accounts]
	);

	const onCancelCompleted = useCallback(() => {
		setCancel1559IsOpen(false);
		setCancelIsOpen(false);
		setExistingGas(undefined);
		setCancelTxId(undefined);
		setExistingTx(undefined);
	}, []);

	const toggleRetry = useCallback(() => {
		setRetryIsOpen(!retryIsOpen);
	}, [retryIsOpen]);

	const handleCancelTransactionFailure = useCallback(
		(e) => {
			Logger.error(e, { message: `cancelTransaction failed `, cancelTxId });
			InteractionManager.runAfterInteractions(() => {
				toggleRetry();
			});
			setSpeedUp1559IsOpen(false);
			setSpeedUpIsOpen(false);
		},
		[cancelTxId, toggleRetry]
	);

	const speedUpTransaction = useCallback(
		async (EIP1559TransactionData) => {
			const handleSpeedUpTransactionFailure = (e: any) => {
				Logger.error(e, { message: `speedUpTransaction failed `, speedUpTxId });
				InteractionManager.runAfterInteractions(() => {
					toggleRetry();
				});
				setSpeedUp1559IsOpen(false);
				setSpeedUpIsOpen(false);
			};

			try {
				const { TransactionController } = Engine.context as any;
				if (EIP1559TransactionData) {
					await TransactionController.speedUpTransaction(speedUpTxId, {
						maxFeePerGas: `0x${EIP1559TransactionData?.suggestedMaxFeePerGasHex}`,
						maxPriorityFeePerGas: `0x${EIP1559TransactionData?.suggestedMaxPriorityFeePerGasHex}`,
					});
				} else {
					await TransactionController.speedUpTransaction(speedUpTxId);
				}
				onSpeedUpCompleted();
			} catch (e) {
				handleSpeedUpTransactionFailure(e);
			}
		},
		[onSpeedUpCompleted, speedUpTxId, toggleRetry]
	);

	const cancelTransaction = useCallback(
		(EIP1559TransactionData) => {
			try {
				const { TransactionController } = Engine.context as any;
				if (EIP1559TransactionData) {
					TransactionController.stopTransaction(cancelTxId, {
						maxFeePerGas: `0x${EIP1559TransactionData?.suggestedMaxFeePerGasHex}`,
						maxPriorityFeePerGas: `0x${EIP1559TransactionData?.suggestedMaxPriorityFeePerGasHex}`,
					});
				} else {
					TransactionController.stopTransaction(cancelTxId);
				}
				onCancelCompleted();
			} catch (e) {
				handleCancelTransactionFailure(e);
			}
		},
		[cancelTxId, handleCancelTransactionFailure, onCancelCompleted]
	);

	const signQRTransaction = async (tx: any) => {
		const { KeyringController, TransactionController } = Engine.context as any;
		await KeyringController.resetQRKeyringState();
		await TransactionController.approveTransaction(tx.id);
	};

	const cancelUnsignedQRTransaction = async (tx: any) => {
		const { TransactionController } = Engine.context as any;
		await TransactionController.cancelTransaction(tx.id);
	};

	const renderItem = ({ item }: any) => (
		<TransactionElement
			tx={item}
			assetSymbol={assetSymbol}
			onSpeedUpAction={onSpeedUpAction}
			onCancelAction={onCancelAction}
			isQRHardwareAccount={isQRHardware}
			signQRTransaction={signQRTransaction}
			cancelUnsignedQRTransaction={cancelUnsignedQRTransaction}
		/>
	);

	const retry = () => {
		setRetryIsOpen(!retryIsOpen);

		// If the speedUpTxId exists then it is a speed up retry
		if (speedUpTxId) {
			InteractionManager.runAfterInteractions(() => {
				onSpeedUpAction(true, existingGas, existingTx);
			});
		}
		if (cancelTxId) {
			InteractionManager.runAfterInteractions(() => {
				onCancelAction(true, existingGas, existingTx);
			});
		}
	};

	const renderUpdateTxEIP1559Gas = (isCancel: boolean) => {
		if (!existingGas || !existingTx) return null;
		if (existingGas.isEIP1559Transaction && !isSigningQRObject) {
			return (
				<Modal
					isVisible
					animationIn="slideInUp"
					animationOut="slideOutDown"
					style={styles.bottomModal}
					backdropOpacity={0.7}
					animationInTiming={600}
					animationOutTiming={600}
					onBackdropPress={isCancel ? onCancelCompleted : onSpeedUpCompleted}
					onBackButtonPress={isCancel ? onCancelCompleted : onSpeedUpCompleted}
					onSwipeComplete={isCancel ? onCancelCompleted : onSpeedUpCompleted}
					swipeDirection={'down'}
					propagateSwipe
				>
					<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
						<UpdateEIP1559Tx
							gas={existingTx.transaction.gas}
							onSave={isCancel ? cancelTransaction : speedUpTransaction}
							onCancel={isCancel ? onCancelCompleted : onSpeedUpCompleted}
							existingGas={existingGas}
							isCancel={isCancel}
						/>
					</KeyboardAwareScrollView>
				</Modal>
			);
		}
	};

	const renderList = () => {
		const allTxs =
			submittedTransactions && submittedTransactions.length > 0
				? submittedTransactions.concat(confirmedTransactions)
				: transactions;

		const renderSpeedUpGas = () => {
			if (!existingGas) return null;
			if (!existingGas.isEIP1559Transaction)
				return `${renderFromWei(Math.floor(existingGas.gasPrice * SPEED_UP_RATE))} ${strings('unit.eth')}`;
		};

		const renderCancelGas = () => {
			if (!existingGas) return null;
			if (!existingGas.isEIP1559Transaction)
				return `${renderFromWei(Math.floor(existingGas.gasPrice * CANCEL_RATE))} ${strings('unit.eth')}`;
		};

		return (
			<View style={styles.wrapper} testID={'transactions-screen'}>
				<FlatList
					ref={flatListRef}
					getItemLayout={getItemLayout}
					data={allTxs}
					keyExtractor={keyExtractor}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					renderItem={renderItem}
					initialNumToRender={10}
					maxToRenderPerBatch={2}
					onEndReachedThreshold={0.5}
					ListHeaderComponent={header}
					ListFooterComponent={renderViewMore}
					style={baseStyles.flexGrow}
					scrollIndicatorInsets={{ right: 1 }}
				/>

				{!isSigningQRObject && cancelIsOpen && (
					<TransactionActionModal
						isVisible={cancelIsOpen}
						confirmDisabled={cancelConfirmDisabled}
						onCancelPress={onCancelCompleted}
						onConfirmPress={cancelTransaction}
						confirmText={strings('transaction.lets_try')}
						confirmButtonMode={'confirm'}
						cancelText={strings('transaction.nevermind')}
						feeText={renderCancelGas()}
						titleText={strings('transaction.cancel_tx_title')}
						gasTitleText={strings('transaction.gas_cancel_fee')}
						descriptionText={strings('transaction.cancel_tx_message')}
					/>
				)}

				{!isSigningQRObject && speedUpIsOpen && (
					<TransactionActionModal
						isVisible={speedUpIsOpen && !isSigningQRObject}
						confirmDisabled={speedUpConfirmDisabled}
						onCancelPress={onSpeedUpCompleted}
						onConfirmPress={speedUpTransaction}
						confirmText={strings('transaction.lets_try')}
						confirmButtonMode={'confirm'}
						cancelText={strings('transaction.nevermind')}
						feeText={renderSpeedUpGas()}
						titleText={strings('transaction.speedup_tx_title')}
						gasTitleText={strings('transaction.gas_speedup_fee')}
						descriptionText={strings('transaction.speedup_tx_message')}
					/>
				)}

				<RetryModal
					onCancelPress={toggleRetry}
					onConfirmPress={retry}
					retryIsOpen={retryIsOpen}
					errorMsg={''}
				/>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.wrapper} testID={'txn-screen'}>
			{!ready || loading ? renderLoader() : !transactions.length ? renderEmpty() : renderList()}
			{(speedUp1559IsOpen || cancel1559IsOpen) && renderUpdateTxEIP1559Gas(cancel1559IsOpen)}
		</SafeAreaView>
	);
};

export default withQRHardwareAwareness(Transactions);
