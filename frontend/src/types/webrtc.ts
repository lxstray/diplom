export interface PeerStream {
  peerId: string;
  stream: MediaStream;
  isLocal?: boolean;
}

export interface WebRTCConfig {
  roomId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}

export interface SignalingMessage {
  // Generic "signal" wrapper for simple-peer's signaling data
  type: 'signal';
  from: string;
  to: string;
  roomId: string;
  payload?: any;
}
