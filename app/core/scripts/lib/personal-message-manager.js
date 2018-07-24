const EventEmitter = require('events');
const ObservableStore = require('obs-store');
const ethUtil = require('ethereumjs-util');
const createId = require('./random-id');
const hexRe = /^[0-9A-Fa-f]+$/g;
const log = require('loglevel');

/**
 * Represents, and contains data about, an 'personal_sign' type signature request. These are created when a
 * signature for an personal_sign call is requested.
 *
 * @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-personal.html#sign}
 *
 * @typedef {Object} PersonalMessage
 * @property {number} id An id to track and identify the message object
 * @property {Object} msgParams The parameters to pass to the personal_sign method once the signature request is
 * approved.
 * @property {Object} msgParams.metamaskId Added to msgParams for tracking and identification within MetaMask.
 * @property {string} msgParams.data A hex string conversion of the raw buffer data of the signature request
 * @property {number} time The epoch time at which the this message was created
 * @property {string} status Indicates whether the signature request is 'unapproved', 'approved', 'signed' or 'rejected'
 * @property {string} type The json-prc signing method for which a signature request has been made. A 'Message' will
 * always have a 'personal_sign' type.
 *
 */

module.exports = class PersonalMessageManager extends EventEmitter {
	/**
	 * Controller in charge of managing - storing, adding, removing, updating - PersonalMessage.
	 *
	 * @typedef {Object} PersonalMessageManager
	 * @param {Object} opts @deprecated
	 * @property {Object} memStore The observable store where PersonalMessage are saved with persistance.
	 * @property {Object} memStore.unapprovedPersonalMsgs A collection of all PersonalMessages in the 'unapproved' state
	 * @property {number} memStore.unapprovedPersonalMsgCount The count of all PersonalMessages in this.memStore.unapprobedMsgs
	 * @property {array} messages Holds all messages that have been created by this PersonalMessageManager
	 *
	 */
	constructor(opts) {
		super();
		this.memStore = new ObservableStore({
			unapprovedPersonalMsgs: {},
			unapprovedPersonalMsgCount: 0
		});
		this.messages = [];
	}

	/**
	 * A getter for the number of 'unapproved' PersonalMessages in this.messages
	 *
	 * @returns {number} The number of 'unapproved' PersonalMessages in this.messages
	 *
	 */
	get unapprovedPersonalMsgCount() {
		return Object.keys(this.getUnapprovedMsgs()).length;
	}

	/**
	 * A getter for the 'unapproved' PersonalMessages in this.messages
	 *
	 * @returns {Object} An index of PersonalMessage ids to PersonalMessages, for all 'unapproved' PersonalMessages in
	 * this.messages
	 *
	 */
	getUnapprovedMsgs() {
		return this.messages.filter(msg => msg.status === 'unapproved').reduce((result, msg) => {
			result[msg.id] = msg;
			return result;
		}, {});
	}

	/**
	 * Creates a new PersonalMessage with an 'unapproved' status using the passed msgParams. this.addMsg is called to add
	 * the new PersonalMessage to this.messages, and to save the unapproved PersonalMessages from that list to
	 * this.memStore.
	 *
	 * @param {Object} msgParams The params for the eth_sign call to be made after the message is approved.
	 * @returns {number} The id of the newly created PersonalMessage.
	 *
	 */
	addUnapprovedMessage(msgParams) {
		log.debug(`PersonalMessageManager addUnapprovedMessage: ${JSON.stringify(msgParams)}`);
		msgParams.data = this.normalizeMsgData(msgParams.data);
		// create txData obj with parameters and meta data
		var time = new Date().getTime();
		var msgId = createId();
		var msgData = {
			id: msgId,
			msgParams: msgParams,
			time: time,
			status: 'unapproved',
			type: 'personal_sign'
		};
		this.addMsg(msgData);

		// signal update
		this.emit('update');
		return msgId;
	}

	/**
	 * Adds a passed PersonalMessage to this.messages, and calls this._saveMsgList() to save the unapproved PersonalMessages from that
	 * list to this.memStore.
	 *
	 * @param {Message} msg The PersonalMessage to add to this.messages
	 *
	 */
	addMsg(msg) {
		this.messages.push(msg);
		this._saveMsgList();
	}

	/**
	 * Returns a specified PersonalMessage.
	 *
	 * @param {number} msgId The id of the PersonalMessage to get
	 * @returns {PersonalMessage|undefined} The PersonalMessage with the id that matches the passed msgId, or undefined
	 * if no PersonalMessage has that id.
	 *
	 */
	getMsg(msgId) {
		return this.messages.find(msg => msg.id === msgId);
	}

	/**
	 * Approves a PersonalMessage. Sets the message status via a call to this.setMsgStatusApproved, and returns a promise
	 * with any the message params modified for proper signing.
	 *
	 * @param {Object} msgParams The msgParams to be used when eth_sign is called, plus data added by MetaMask.
	 * @param {Object} msgParams.metamaskId Added to msgParams for tracking and identification within MetaMask.
	 * @returns {Promise<object>} Promises the msgParams object with metamaskId removed.
	 *
	 */
	approveMessage(msgParams) {
		this.setMsgStatusApproved(msgParams.metamaskId);
		return this.prepMsgForSigning(msgParams);
	}

	/**
	 * Sets a PersonalMessage status to 'approved' via a call to this._setMsgStatus.
	 *
	 * @param {number} msgId The id of the PersonalMessage to approve.
	 *
	 */
	setMsgStatusApproved(msgId) {
		this._setMsgStatus(msgId, 'approved');
	}

	/**
	 * Sets a PersonalMessage status to 'signed' via a call to this._setMsgStatus and updates that PersonalMessage in
	 * this.messages by adding the raw signature data of the signature request to the PersonalMessage
	 *
	 * @param {number} msgId The id of the PersonalMessage to sign.
	 * @param {buffer} rawSig The raw data of the signature request
	 *
	 */
	setMsgStatusSigned(msgId, rawSig) {
		const msg = this.getMsg(msgId);
		msg.rawSig = rawSig;
		this._updateMsg(msg);
		this._setMsgStatus(msgId, 'signed');
	}

	/**
	 * Removes the metamaskId property from passed msgParams and returns a promise which resolves the updated msgParams
	 *
	 * @param {Object} msgParams The msgParams to modify
	 * @returns {Promise<object>} Promises the msgParams with the metamaskId property removed
	 *
	 */
	prepMsgForSigning(msgParams) {
		delete msgParams.metamaskId;
		return Promise.resolve(msgParams);
	}

	/**
	 * Sets a PersonalMessage status to 'rejected' via a call to this._setMsgStatus.
	 *
	 * @param {number} msgId The id of the PersonalMessage to reject.
	 *
	 */
	rejectMsg(msgId) {
		this._setMsgStatus(msgId, 'rejected');
	}

	/**
	 * Updates the status of a PersonalMessage in this.messages via a call to this._updateMsg
	 *
	 * @private
	 * @param {number} msgId The id of the PersonalMessage to update.
	 * @param {string} status The new status of the PersonalMessage.
	 * @throws A 'PersonalMessageManager - PersonalMessage not found for id: "${msgId}".' if there is no PersonalMessage
	 * in this.messages with an id equal to the passed msgId
	 * @fires An event with a name equal to `${msgId}:${status}`. The PersonalMessage is also fired.
	 * @fires If status is 'rejected' or 'signed', an event with a name equal to `${msgId}:finished` is fired along
	 * with the PersonalMessage
	 *
	 */
	_setMsgStatus(msgId, status) {
		const msg = this.getMsg(msgId);
		if (!msg) throw new Error('PersonalMessageManager - Message not found for id: "${msgId}".');
		msg.status = status;
		this._updateMsg(msg);
		this.emit(`${msgId}:${status}`, msg);
		if (status === 'rejected' || status === 'signed') {
			this.emit(`${msgId}:finished`, msg);
		}
	}

	/**
	 * Sets a PersonalMessage in this.messages to the passed PersonalMessage if the ids are equal. Then saves the
	 * unapprovedPersonalMsgs index to storage via this._saveMsgList
	 *
	 * @private
	 * @param {msg} PersonalMessage A PersonalMessage that will replace an existing PersonalMessage (with the same
	 * id) in this.messages
	 *
	 */
	_updateMsg(msg) {
		const index = this.messages.findIndex(message => message.id === msg.id);
		if (index !== -1) {
			this.messages[index] = msg;
		}
		this._saveMsgList();
	}

	/**
	 * Saves the unapproved PersonalMessages, and their count, to this.memStore
	 *
	 * @private
	 * @fires 'updateBadge'
	 *
	 */
	_saveMsgList() {
		const unapprovedPersonalMsgs = this.getUnapprovedMsgs();
		const unapprovedPersonalMsgCount = Object.keys(unapprovedPersonalMsgs).length;
		this.memStore.updateState({ unapprovedPersonalMsgs, unapprovedPersonalMsgCount });
		this.emit('updateBadge');
	}

	/**
	 * A helper function that converts raw buffer data to a hex, or just returns the data if it is already formatted as a hex.
	 *
	 * @param {any} data The buffer data to convert to a hex
	 * @returns {string} A hex string conversion of the buffer data
	 *
	 */
	normalizeMsgData(data) {
		try {
			const stripped = ethUtil.stripHexPrefix(data);
			if (stripped.match(hexRe)) {
				return ethUtil.addHexPrefix(stripped);
			}
		} catch (e) {
			log.debug(`Message was not hex encoded, interpreting as utf8.`);
		}

		return ethUtil.bufferToHex(new Buffer(data, 'utf8'));
	}
};
