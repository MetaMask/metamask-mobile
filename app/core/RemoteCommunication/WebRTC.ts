/* eslint-disable no-console */
import { EventEmitter2 } from 'eventemitter2';
import Socket from './Socket';
import KeyExchange from './KeyExchange';

export default class WebRTC extends EventEmitter2 {
  handshakeDone = false;

  isOriginator = false;

  clientsConnected = false;

  clientsReady = false;

  socket = null;

  webrtc = null;

  dataChannel = null;

  keyExchange: KeyExchange;

  RTCPeerConnection: any;

  RTCSessionDescription: any;

  RTCIceCandidate: any;
  reconnect: boolean;

  constructor({ otherPublicKey, webRTCLib, commLayer, reconnect }) {
    super();
    this.reconnect = reconnect;
    if (webRTCLib) {
      this.RTCPeerConnection = webRTCLib.RTCPeerConnection;
      this.RTCSessionDescription = webRTCLib.RTCSessionDescription;
      this.RTCIceCandidate = webRTCLib.RTCIceCandidate;
    } else {
      this.RTCPeerConnection = RTCPeerConnection;
      this.RTCSessionDescription = RTCSessionDescription;
      this.RTCIceCandidate = RTCIceCandidate;
    }

    this.socket = new Socket({ otherPublicKey, commLayer, reconnect });

    this.keyExchange = new KeyExchange({
      CommLayer: this,
      otherPublicKey: null,
      sendPublicKey: true,
    });

    this.keyExchange.on('keys_exchanged', () => {
      this.clientsReady = true;
      this.emit('clients_ready', {
        isOriginator: this.isOriginator,
      });
    });

    this.socket.on('clients_disconnected', () => {
      if (!this.clientsConnected) {
        this.socket.removeAllListeners();
        return this.emit('clients_disconnected');
      }
      return this.clientsConnected;
    });

    this.socket.on('message', async ({ message }) => {
      const { offer, answer, candidate, type } = message;
      if (type === 'offer') {
        await this.webrtc.setRemoteDescription(
          new this.RTCSessionDescription(offer),
        );

        const answerLocal = await this.webrtc.createAnswer();
        await this.webrtc.setLocalDescription(answerLocal);

        this.socket.sendMessage({ type: 'answer', answer: answerLocal });
      } else if (type === 'answer') {
        await this.webrtc.setRemoteDescription(
          new this.RTCSessionDescription(answer),
        );

        this.handshakeDone = true;
      } else if (type === 'candidate') {
        this.webrtc.addIceCandidate(new this.RTCIceCandidate(candidate));
      }
    });

    this.socket.on('clients_ready', async ({ isOriginator }) => {
      this.setupWebrtc();
      if (!isOriginator) {
        return;
      }
      const offer = await this.webrtc.createOffer();

      await this.webrtc.setLocalDescription(offer);

      this.isOriginator = isOriginator;
      this.socket.sendMessage({ type: 'offer', offer });
    });

    this.socket.on('channel_created', (id) => {
      this.emit('channel_created', id);
    });

    this.socket.on('clients_waiting_to_join', (numberUsers) => {
      this.emit('clients_waiting_to_join', numberUsers);
    });
  }

  setupWebrtc() {
    const configuration = {
      iceServers: [{ urls: 'stun:15.237.115.65' }],
    };

    this.webrtc = new this.RTCPeerConnection(configuration);

    this.webrtc.ondatachannel = (evt) => {
      console.log('Data channel is created!');
      const receiveChannel = evt.channel;
      receiveChannel.onopen = () => {
        console.log('Data channel is open and ready to be used.');
        this.clientsConnected = true;

        if (this.isOriginator) {
          if (!this.keyExchange.keysExchanged) {
            this.keyExchange.start(this.isOriginator);
          }
        }
        if (this.reconnect) {
          if (this.keyExchange.keysExchanged) {
            this.sendMessage({ type: 'ready' });
            this.emit('clients_ready', {
              isOriginator: this.isOriginator,
            });
          } else if (!this.isOriginator) {
            this.sendMessage({ type: 'key_handshake_start' });
          }
          this.reconnect = false;
        }
      };

      this.onMessage = this.onMessage.bind(this);

      receiveChannel.onmessage = this.onMessage;
    };

    this.webrtc.onconnectionstatechange = () => {
      const connectionStatus = this.webrtc.connectionState;
      console.log('connectionStatus', connectionStatus);
      if (['disconnected', 'failed', 'closed'].includes(connectionStatus)) {
        return this.emit('clients_disconnected');
      }

      return connectionStatus;
    };

    this.webrtc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.sendMessage({
          type: 'candidate',
          candidate,
        });
      }
    };

    this.webrtc.onicecandidateerror = (error) =>
      console.log('ICE ERROR', error);

    this.dataChannel = this.webrtc.createDataChannel('messenger');

    this.dataChannel.onerror = (error) => {
      if (error.error.code === 0) {
        return this.emit('clients_disconnected');
      }
      console.log('ERROR: datachannel', error);
      return error;
    };
  }

  connectToChannel(id) {
    this.socket.connectToChannel(id);
  }

  onMessage(message) {
    /* if (!message.isTrusted) {
      throw new Error('Message not trusted');
    }*/

    if (!this.keyExchange.keysExchanged) {
      const messageReceived = JSON.parse(message.data);
      if (messageReceived?.type.startsWith('key_handshake')) {
        return this.emit('key_exchange', { message: messageReceived });
      }
      throw new Error('Keys not exchanged');
    }

    const decryptedMessage = this.keyExchange.decryptMessage(message.data);
    const messageReceived = JSON.parse(decryptedMessage);
    return this.emit('message', { message: messageReceived });
  }

  sendMessage(message) {
    if (!this.clientsConnected) {
      throw new Error('Clients not connected');
    }
    if (!this.keyExchange.keysExchanged) {
      if (message?.type.startsWith('key_handshake')) {
        return this.dataChannel.send(JSON.stringify(message));
      }
      throw new Error('Keys not exchanged');
    }
    const encryptedMessage = this.keyExchange.encryptMessage(
      JSON.stringify(message),
    );

    return this.dataChannel.send(encryptedMessage);
  }

  createChannel() {
    return this.socket.createChannel();
  }

  pause() {
    if (this.keyExchange.keysExchanged) this.sendMessage({ type: 'pause' });
    this.webrtc?.close();
    // this.removeAllListeners();
    this.socket.pause();
    //this.socket.removeAllListeners();
  }

  resume() {
    this.reconnect = true;
    this.socket.resume();
  }
}
