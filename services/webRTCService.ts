
import { DEFAULT_RTC_CONFIG, OPUS_CONSTRAINTS } from '../constants';
import { optimizeSDP } from './sdpUtils';

export class WebRTCService {
  public pc: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private currentBitrate: number = OPUS_CONSTRAINTS.maxBitrate;

  async initLocalStream() {
    // Optimized for low power and high quality voice
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: OPUS_CONSTRAINTS.sampleRate, // 16kHz for efficiency
        channelCount: 1, // Mono
      },
      video: false
    });
    return this.localStream;
  }

  createPeerConnection(onIceCandidate: (c: RTCIceCandidate) => void, onTrack: (s: MediaStream) => void) {
    this.pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) onIceCandidate(event.candidate);
    };

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      onTrack(this.remoteStream);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    return this.pc;
  }

  async createOffer(bitrate: number) {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    offer.sdp = optimizeSDP(offer.sdp!, bitrate);
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit, bitrate: number) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    answer.sdp = optimizeSDP(answer.sdp!, bitrate);
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    
    // Crucial: Set bitrate limiting via RTCRtpSender API
    this.applyBitrateConstraint(OPUS_CONSTRAINTS.maxBitrate);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.pc) await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async applyBitrateConstraint(bitrateBps: number) {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const audioSender = senders.find(s => s.track?.kind === 'audio');
    if (audioSender) {
      const params = audioSender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      params.encodings[0].maxBitrate = bitrateBps;
      await audioSender.setParameters(params);
    }
  }

  cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}
