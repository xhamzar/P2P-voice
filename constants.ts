
export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export const OPUS_CONSTRAINTS = {
  minBitrate: 8000,
  maxBitrate: 24000,
  sampleRate: 16000,
};

export const DATA_USAGE_ESTIMATE = "Estimated: 10-15 MB/hour (bidirectional)";
