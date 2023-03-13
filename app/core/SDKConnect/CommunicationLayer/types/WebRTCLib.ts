export interface WebRTCLib {
  RTCPeerConnection: RTCPeerConnection;
  RTCIceCandidate: RTCIceCandidate;
  RTCSessionDescription: RTCSessionDescription;
  RTCView: unknown;
  MediaStream: MediaStream;
  MediaStreamTrack: MediaStreamTrack;
  mediaDevices: MediaDevices;
  registerGlobals: () => void;
}
