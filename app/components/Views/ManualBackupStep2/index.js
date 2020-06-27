import React, { PureComponent } from 'react';
import {
	InteractionManager,
	ScrollView,
	Alert,
	Text,
	TouchableOpacity,
	View,
	SafeAreaView,
	StyleSheet
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Feather';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { seedphraseBackedUp } from '../../../actions/user';
import CustomAlert from '../../UI/CustomAlert';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 32,
		paddingTop: 0,
		justifyContent: 'flex-end'
	},
	action: {
		fontSize: 18,
		marginBottom: 16,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	infoWrapper: {
		marginBottom: 16,
		justifyContent: 'center'
	},
	info: {
		fontSize: 16,
		color: colors.fontPrimary,
		textAlign: 'center',
		...fontStyles.normal,
		paddingHorizontal: 6
	},
	seedPhraseWrapper: {
		backgroundColor: colors.white,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1,
		marginBottom: 24
	},
	seedPhraseWrapperComplete: {
		borderColor: colors.green500
	},
	seedPhraseWrapperError: {
		borderColor: colors.red
	},
	colLeft: {
		flex: 1,
		paddingTop: 18,
		paddingLeft: 27,
		paddingBottom: 4,
		alignItems: 'flex-start'
	},
	colRight: {
		flex: 1,
		paddingTop: 18,
		paddingRight: 27,
		paddingBottom: 4,
		alignItems: 'flex-end'
	},
	wordBoxWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 14
	},
	wordBoxWrapperSuccess: {
		marginBottom: 8
	},
	wordWrapper: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		width: 95,
		backgroundColor: colors.white,
		borderColor: colors.grey050,
		borderWidth: 1,
		borderRadius: 34,
		borderStyle: 'dashed',
		marginLeft: 4
	},
	word: {
		fontSize: 14,
		color: colors.fontPrimary,
		lineHeight: 14,
		textAlign: 'center'
	},
	selectableWord: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		color: colors.fontPrimary,
		width: 95,
		backgroundColor: colors.white,
		borderColor: colors.blue,
		borderWidth: 1,
		marginBottom: 6,
		borderRadius: 13,
		textAlign: 'center'
	},
	selectableWordText: {
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 14
	},
	words: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 20
	},
	successRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 86
	},
	successText: {
		fontSize: 12,
		color: colors.green500,
		marginLeft: 4
	},
	selectedWord: {
		backgroundColor: colors.grey400,
		borderWidth: 1,
		borderColor: colors.grey400
	},
	selectedWordText: {
		color: colors.white
	},
	currentWord: {
		borderWidth: 1,
		borderColor: colors.blue
	},
	confirmedWord: {
		borderWidth: 1,
		borderColor: colors.blue,
		borderStyle: 'solid'
	},
	succesModalText: {
		textAlign: 'center',
		fontSize: 13,
		...fontStyles.normal
	}
});

/**
 * View that's shown during the fifth step of
 * the backup seed phrase flow
 */
class ManualBackupStep2 extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * The action to update the seedphrase backed up flag
		 * in the redux store
		 */
		seedphraseBackedUp: PropTypes.func
	};

	constructor(props) {
		super(props);
		const words = [
			'One',
			'Two',
			'Three',
			'Four',
			'Five',
			'Six',
			'Seven',
			'Eight',
			'Nine',
			'Ten',
			'Eleven',
			'Twelve'
		];
		if (process.env.JEST_WORKER_ID === undefined) {
			this.words = [...words].sort(() => 0.5 - Math.random());
		} else {
			this.words = words;
		}
	}

	state = {
		confirmedWords: Array(12).fill({ word: undefined, originalPosition: undefined }),
		showSuccessModal: false,
		wordsDict: {},
		currentIndex: 0,
		seedPhraseReady: false,
		currentStep: 3
	};

	componentDidMount = () => {
		this.createWordsDictionary();
	};

	createWordsDictionary = () => {
		const dict = {};
		this.words.forEach((word, i) => {
			dict[`${word},${i}`] = { currentPosition: undefined };
		});
		this.setState({ wordsDict: dict });
	};

	findNextAvailableIndex = () => {
		const { confirmedWords } = this.state;
		return confirmedWords.findIndex(({ word }) => !word);
	};

	selectWord = (word, i) => {
		const { wordsDict, confirmedWords } = this.state;
		let currentIndex = this.state.currentIndex;
		if (wordsDict[`${word},${i}`].currentPosition !== undefined) {
			currentIndex = wordsDict[`${word},${i}`].currentPosition;
			wordsDict[`${word},${i}`].currentPosition = undefined;
			confirmedWords[currentIndex] = { word: undefined, originalPosition: undefined };
		} else {
			wordsDict[`${word},${i}`].currentPosition = currentIndex;
			confirmedWords[currentIndex] = { word, originalPosition: i };
			currentIndex = this.findNextAvailableIndex();
		}
		this.setState({
			currentIndex,
			wordsDict,
			confirmedWords,
			seedPhraseReady: this.findNextAvailableIndex() === -1
		});
	};

	clearConfirmedWordAt = i => {
		const { confirmedWords, wordsDict } = this.state;
		const { word, originalPosition } = confirmedWords[i];
		const currentIndex = i;
		if (word && (originalPosition || originalPosition === 0)) {
			wordsDict[[word, originalPosition]].currentPosition = undefined;
			confirmedWords[i] = { word: undefined, originalPosition: undefined };
		}
		this.setState({
			currentIndex,
			wordsDict,
			confirmedWords,
			seedPhraseReady: this.findNextAvailableIndex() === -1
		});
	};

	goBack = () => {
		this.props.navigation.goBack();
	};

	goNext = () => {
		if (this.validateWords()) {
			this.props.seedphraseBackedUp();
			this.setState({ showSuccessModal: true });
		} else {
			Alert.alert(strings('account_backup_step_5.error_title'), strings('account_backup_step_5.error_message'));
		}
	};

	onSuccesModalAction = () => {
		this.setState({ showSuccessModal: false });
		InteractionManager.runAfterInteractions(() => {
			const words = this.props.navigation.getParam('words', []);
			this.props.navigation.navigate('AccountBackupStep6', { words });
			// Clean up
			setTimeout(() => {
				this.setState({ confirmedWords: [] });
				this.words = null;
			}, 1000);
		});
	};

	validateWords = () => {
		const words = this.props.navigation.getParam('words', []);
		const confirmedWords = this.state.confirmedWords.map(confirmedWord => confirmedWord.word);
		if (words.join('') === confirmedWords.join('')) {
			return true;
		}
		return false;
	};

	renderWords = () => {
		const { wordsDict } = this.state;
		return (
			<View style={styles.words}>
				{Object.keys(wordsDict).map((key, i) => this.renderWordSelectableBox(key, i))}
			</View>
		);
	};

	renderSuccess = () => (
		<View style={styles.successRow}>
			<MaterialIcon name="check-circle" size={15} color={colors.green500} />
			<Text style={styles.successText}>{strings('manual_backup_step_2.success')}</Text>
		</View>
	);

	renderWordBox = (word, i) => {
		const { currentIndex, confirmedWords } = this.state;
		return (
			<View style={[styles.wordBoxWrapper, this.validateWords() && styles.wordBoxWrapperSuccess]}>
				<Text>{i + 1}.</Text>
				<TouchableOpacity
					key={`word_${i}`}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={() => {
						this.clearConfirmedWordAt(i);
					}}
					style={[
						styles.wordWrapper,
						i === currentIndex && styles.currentWord,
						confirmedWords[i].word && styles.confirmedWord
					]}
				>
					<Text style={styles.word}>{word}</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderWordSelectableBox = (key, i) => {
		const { wordsDict } = this.state;
		const [word] = key.split(',');
		const selected = wordsDict[key].currentPosition !== undefined;
		return (
			<TouchableOpacity
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => this.selectWord(word, i)}
				style={[styles.selectableWord, selected && styles.selectedWord]}
				key={`selectableWord_${i}`}
			>
				<Text style={[styles.selectableWordText, selected && styles.selectedWordText]}>{word}</Text>
			</TouchableOpacity>
		);
	};

	render = () => {
		const { confirmedWords, seedPhraseReady } = this.state;
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					style={styles.mainWrapper}
					contentContainerStyle={styles.mainWrapper}
					testID={'account-backup-step-5-screen'}
				>
					<View style={styles.wrapper} testID={'protect-your-account-screen'}>
						<OnboardingProgress currentStep={this.state.currentStep} />
						<Text style={styles.action}>{strings('manual_backup_step_2.action')}</Text>
						<View style={styles.infoWrapper}>
							<Text style={styles.info}>{strings('manual_backup_step_2.info')}</Text>
						</View>

						<View
							style={[
								styles.seedPhraseWrapper,
								seedPhraseReady && styles.seedPhraseWrapperError,
								this.validateWords() && styles.seedPhraseWrapperComplete
							]}
						>
							<View style={styles.colLeft}>
								{confirmedWords.slice(0, 6).map(({ word }, i) => this.renderWordBox(word, i))}
							</View>
							<View style={styles.colRight}>
								{confirmedWords.slice(-6).map(({ word }, i) => this.renderWordBox(word, i + 6))}
							</View>
						</View>
						{this.validateWords() ? this.renderSuccess() : this.renderWords()}
						<StyledButton
							containerStyle={styles.button}
							type={'confirm'}
							onPress={this.goNext}
							testID={'submit-button'}
							disabled={!seedPhraseReady || !this.validateWords()}
						>
							{strings('manual_backup_step_2.complete')}
						</StyledButton>
					</View>
					<CustomAlert
						headerStyle={{ backgroundColor: colors.green500 }}
						headerContent={<Icon color={colors.white} name={'check'} size={100} />}
						titleText={strings('account_backup_step_5.modal_title')}
						buttonText={strings('account_backup_step_5.modal_button')}
						onPress={this.onSuccesModalAction}
						isVisible={this.state.showSuccessModal}
					>
						<Text style={styles.succesModalText}>{strings('account_backup_step_5.modal_text')}</Text>
					</CustomAlert>
				</ScrollView>
			</SafeAreaView>
		);
	};
}

const mapDispatchToProps = dispatch => ({
	seedphraseBackedUp: () => dispatch(seedphraseBackedUp())
});

export default connect(
	null,
	mapDispatchToProps
)(ManualBackupStep2);
