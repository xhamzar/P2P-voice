
export enum CallStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  INCOMING_CALL = 'INCOMING_CALL',
  IN_CALL = 'IN_CALL',
  ERROR = 'ERROR'
}

export type SignalingMessage = {
  type: 'offer' | 'answer' | 'candidate' | 'hangup';
  sender: string;
  target: string;
  payload: any;
};

export interface RTCOptions {
  bitrate: number; // in bps
  sampleRate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}
