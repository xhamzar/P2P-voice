
import { Peer } from 'peerjs';
import { DEFAULT_RTC_CONFIG } from '../constants';

class PeerService {
  public peer: Peer | null = null;
  public myId: string = '';
  private onReadyCallback?: (id: string) => void;

  init(onReady: (id: string) => void) {
    this.onReadyCallback = onReady;
    
    // Menggunakan Google STUN servers dari constants.ts
    this.peer = new Peer({
      config: {
        iceServers: DEFAULT_RTC_CONFIG.iceServers,
        iceTransportPolicy: 'all'
      }
    });

    this.peer.on('open', (id) => {
      this.myId = id;
      if (this.onReadyCallback) this.onReadyCallback(id);
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Error Type:', err.type);
      console.error('PeerJS Error Detail:', err);
    });
  }

  destroy() {
    this.peer?.destroy();
  }
}

export const peerService = new PeerService();
