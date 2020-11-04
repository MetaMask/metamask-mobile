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
import Pager from '../../UI/Pager';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { seedphraseBackedUp } from '../../../actions/user';
import CustomAlert from '../../UI/CustomAlert';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
		flex: 1,
		padding: 30,
		paddingTop: 0
	},
	content: {
		alignItems: 'flex-start'
	},
	title: {
		fontSize: 32,
		marginTop: 0,
		marginBottom: 10,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'left',
		...fontStyles.normal
	},
	text: {
		marginBottom: 10,
		justifyContent: 'center'
	},
	label: {
		fontSize: 16,
		lineHeight: 20,
		color: colors.fontPrimary,
		textAlign: 'left',
		...fontStyles.normal
	},
	buttonWrapper: {
		marginTop: 10,
		flex: 1,
		justifyContent: 'flex-end'
	},
	navbarLeftButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 10
	},
	navbarLeftText: {
		fontSize: 18,
		color: colors.blue,
		...fontStyles.normal
	},
	seedPhraseWrapper: {
		backgroundColor: colors.grey000,
		borderRadius: 10,
		marginBottom: 20,
		flexDirection: 'row',
		borderColor: colors.grey100,
		borderWidth: 1
	},
	colLeft: {
		paddingVertical: 20,
		paddingBottom: 10,
		flex: 1,
		alignItems: 'center',
		borderColor: colors.grey100,
		borderRightWidth: 1
	},
	colRight: {
		paddingVertical: 20,
		paddingBottom: 10,
		flex: 1,
		alignItems: 'center'
	},
	word: {
		paddingHorizontal: 8,
		paddingTop: 6,
		paddingBottom: 4,
		width: 105,
		fontSize: 14,
		lineHeight: 14,
		color: colors.fontPrimary,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderWidth: 1,
		marginBottom: 15,
		borderRadius: 4
	},
	selectableWord: {
		borderColor: colors.blue,
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 5,
		width: 95,
		fontSize: 14,
		color: colors.fontPrimary,
		lineHeight: 14,
		backgroundColor: colors.white,
		marginBottom: 6,
		borderRadius: 4
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
class AccountBackupStep5 extends PureComponent {
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
		const words = props.navigation.getParam('words', []);
		if (process.env.JEST_WORKER_ID === undefined) {
			this.words = [...words].sort(() => 0.5 - Math.random());
		} else {
			this.words = words;
		}
	}

	state = {
		confirmedWords: [],
		showSuccessModal: false,
		wordsDict: {},
		currentIndex: 0,
		seedPhraseReady: false
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		const words = navigation.getParam('words', []);
		this.setState(
			{
				confirmedWords: Array(words.length).fill({ word: undefined, originalPosition: undefined })
			},
			this.createWordsDictionary
		);
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
		const words = this.props.navigation.getParam('words', []);
		const confirmedWords = this.state.confirmedWords.map(confirmedWord => confirmedWord.word);
		if (words.join('') === confirmedWords.join('')) {
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

	renderWordBox = (word, i) => {
		const { currentIndex } = this.state;
		let wordText = '';
		if (word) wordText = `${i + 1}. ${word}`;
		return (
			<TouchableOpacity
				key={`word_${i}`}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => {
					this.clearConfirmedWordAt(i);
				}}
			>
				<Text style={[styles.word, i === currentIndex ? styles.currentWord : null]}>{wordText}</Text>
			</TouchableOpacity>
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
		const { confirmedWords, wordsDict, seedPhraseReady } = this.state;
		const wordLength = confirmedWords.length;
		const half = wordLength / 2;
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView style={styles.mainWrapper} testID={'account-backup-step-5-screen'}>
					<Pager pages={5} selected={4} />
					<TouchableOpacity onPress={this.goBack} style={styles.navbarLeftButton}>
						<Text style={styles.navbarLeftText}>{strings('account_backup_step_5.back')}</Text>
					</TouchableOpacity>
					<View style={styles.wrapper} testID={'protect-your-account-screen'}>
						<View style={styles.content}>
							<Text style={styles.title}>{strings('account_backup_step_5.title')}</Text>
							<View style={styles.text}>
								<Text style={styles.label}>{strings('account_backup_step_5.info_text')}</Text>
							</View>

							<View style={styles.seedPhraseWrapper}>
								<View style={styles.colLeft}>
									{confirmedWords.slice(0, half).map(({ word }, i) => this.renderWordBox(word, i))}
								</View>
								<View style={styles.colRight}>
									{confirmedWords
										.slice(-half)
										.map(({ word }, i) => this.renderWordBox(word, i + half))}
								</View>
							</View>

							<View style={styles.words}>
								{Object.keys(wordsDict).map((key, i) => this.renderWordSelectableBox(key, i))}
							</View>
						</View>
						<View style={styles.buttonWrapper}>
							<StyledButton
								containerStyle={styles.button}
								type={'confirm'}
								onPress={this.goNext}
								testID={'submit-button'}
								disabled={!seedPhraseReady}
							>
								{strings('account_backup_step_5.cta_text')}
							</StyledButton>
						</View>
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
)(AccountBackupStep5);
