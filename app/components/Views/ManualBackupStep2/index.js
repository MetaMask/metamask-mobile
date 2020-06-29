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
import OnboardingProgress from '../../UI/OnboardingProgress';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { seedphraseBackedUp } from '../../../actions/user';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1,
		paddingTop: 12
	},
	wrapper: {
		flex: 1,
		paddingHorizontal: 32
	},
	onBoardingWrapper: {
		paddingHorizontal: 20
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
		justifyContent: 'space-between',
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
		paddingTop: 18,
		paddingLeft: 27,
		paddingBottom: 4,
		alignItems: 'flex-start'
	},
	colRight: {
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
		justifyContent: 'space-between'
	},
	successRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
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
	buttonWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
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
		const words = props.navigation.getParam('words');
		if (process.env.JEST_WORKER_ID === undefined) {
			this.words = [...words].sort(() => 0.5 - Math.random());
		} else {
			this.words = words;
		}
	}

	state = {
		confirmedWords: Array(12).fill({ word: undefined, originalPosition: undefined }),
		wordsDict: {},
		currentIndex: 0,
		seedPhraseReady: false,
		currentStep: 3
	};

	componentDidMount = () => {
		this.createWordsDictionary();
		this.steps = this.props.navigation.getParam('steps');
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
		const { seedphraseBackedUp, navigation } = this.props;
		if (this.validateWords()) {
			seedphraseBackedUp();
			InteractionManager.runAfterInteractions(() => {
				navigation.navigate('ManualBackupStep3');
			});
		} else {
			Alert.alert(strings('account_backup_step_5.error_title'), strings('account_backup_step_5.error_message'));
		}
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
			<View key={`word_${i}`} style={styles.wordBoxWrapper}>
				<Text>{i + 1}.</Text>
				<TouchableOpacity
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
					contentContainerStyle={styles.scrollviewWrapper}
					testID={'account-backup-step-5-screen'}
				>
					<View style={styles.onBoardingWrapper}>
						<OnboardingProgress currentStep={this.state.currentStep} stepWords={this.steps} />
					</View>
					<View style={styles.wrapper} testID={'protect-your-account-screen'}>
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
						<View style={styles.buttonWrapper}>
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
					</View>
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
