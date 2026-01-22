
import React, { useState, useEffect, useRef } from 'react';
import { peerService } from './services/signalingService';
import { CallStatus } from './types';
import { OPUS_CONSTRAINTS } from './constants';
import { optimizeSDP } from './services/sdpUtils';
import Visualizer from './components/Visualizer';
import { Phone, PhoneOff, User, Wifi, Activity, Copy, Check, AlertCircle, Mic, MicOff, BellRing } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [connectionDetail, setConnectionDetail] = useState('');
  const [myId, setMyId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const incomingCallRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);

  useEffect(() => {
    // Inisialisasi PeerJS
    peerService.init((id) => {
      setMyId(id);
      setError('');
      
      // Pasang listener panggilan segera setelah ID siap
      peerService.peer?.on('call', (call) => {
        console.log("Menerima panggilan dari:", call.peer);
        incomingCallRef.current = call;
        setTargetId(call.peer);
        setStatus(CallStatus.INCOMING_CALL);
        
        // Opsional: Mainkan suara ringtone ringan di sini
      });
    });

    peerService.peer?.on('error', (err: any) => {
      console.error("PeerJS Global Error:", err.type);
      if (err.type === 'peer-unavailable') {
        setError('ID Teman tidak aktif atau salah.');
      } else if (err.type === 'network') {
        setError('Koneksi internet bermasalah.');
      } else {
        setError(`Gangguan: ${err.type}`);
      }
      setStatus(CallStatus.ERROR);
    });

    return () => peerService.destroy();
  }, []);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.warn("Auto-play blocked, waiting for interaction", e));
    }
  }, [remoteStream]);

  const getOptimizedStream = async () => {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: OPUS_CONSTRAINTS.sampleRate,
        channelCount: 1,
      }
    });
  };

  const setupCallListeners = (call: any) => {
    activeCallRef.current = call;

    call.on('stream', (rStream: MediaStream) => {
      console.log("Remote stream diterima");
      setRemoteStream(rStream);
      setStatus(CallStatus.IN_CALL);
      setConnectionDetail('Terhubung');
    });

    if (call.peerConnection) {
      call.peerConnection.oniceconnectionstatechange = () => {
        const state = call.peerConnection.iceConnectionState;
        setConnectionDetail(`Jalur: ${state}`);
        if (state === 'failed' || state === 'disconnected') {
          handleHangup(false);
        }
      };
    }

    call.on('close', () => handleHangup(false));
    call.on('error', (err: any) => {
      console.error("Call error:", err);
      setError("Gagal menyambungkan suara.");
      handleHangup(false);
    });
  };

  const startCall = async () => {
    if (!targetId) return setError('Masukkan ID tujuan');
    if (targetId === myId) return setError('Tidak bisa memanggil diri sendiri');
    
    setError('');
    setStatus(CallStatus.CONNECTING);
    setConnectionDetail('Memulai Sinyal...');
    
    try {
      const stream = await getOptimizedStream();
      setLocalStream(stream);
      
      const call = peerService.peer?.call(targetId, stream, {
        sdpTransform: (sdp: string) => optimizeSDP(sdp, OPUS_CONSTRAINTS.maxBitrate)
      });
      
      if (call) {
        setupCallListeners(call);
      } else {
        throw new Error("Gagal membuat objek panggilan");
      }
    } catch (err) {
      setError('Gagal akses mikrofon atau sinyal.');
      setStatus(CallStatus.ERROR);
    }
  };

  const answerCall = async () => {
    if (!incomingCallRef.current) return;
    
    setStatus(CallStatus.CONNECTING);
    setConnectionDetail('Menyiapkan Audio...');
    
    try {
      const stream = await getOptimizedStream();
      setLocalStream(stream);
      
      incomingCallRef.current.answer(stream, {
        sdpTransform: (sdp: string) => optimizeSDP(sdp, OPUS_CONSTRAINTS.maxBitrate)
      });
      
      setupCallListeners(incomingCallRef.current);
      incomingCallRef.current = null;
    } catch (err) {
      setError('Izin mikrofon ditolak.');
      setStatus(CallStatus.ERROR);
    }
  };

  const rejectCall = () => {
    if (incomingCallRef.current) {
      incomingCallRef.current.close();
      incomingCallRef.current = null;
    }
    setStatus(CallStatus.IDLE);
    setTargetId('');
  };

  const handleHangup = (shouldClose = true) => {
    if (shouldClose) {
      activeCallRef.current?.close();
      incomingCallRef.current?.close();
    }
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    
    setLocalStream(null);
    setRemoteStream(null);
    setStatus(CallStatus.IDLE);
    setConnectionDetail('');
    activeCallRef.current = null;
    incomingCallRef.current = null;
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-6 relative">
        
        {/* ID DISPLAY */}
        <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-3xl border border-slate-700/30">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${myId ? 'bg-blue-600' : 'bg-slate-700 animate-pulse'}`}>
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">ID Perangkat Anda</p>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-400">{myId || 'Memuat...'}</span>
                {myId && (
                  <button onClick={copyId} className="hover:text-white transition-colors">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          <Wifi size={18} className={myId ? 'text-emerald-500' : 'text-slate-600'} />
        </div>

        {/* UI PANGGILAN MASUK (OVERLAY) */}
        {status === CallStatus.INCOMING_CALL && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
              <div className="relative w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40">
                <BellRing className="w-10 h-10 text-white animate-bounce" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-xs mb-2">Panggilan Masuk</p>
              <h2 className="text-2xl font-black font-mono tracking-tighter">{targetId}</h2>
            </div>

            <div className="flex space-x-6 w-full">
              <button 
                onClick={rejectCall}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl border border-slate-700 transition-all"
              >
                Tolak
              </button>
              <button 
                onClick={answerCall}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95"
              >
                Terima
              </button>
            </div>
          </div>
        )}

        {/* MAIN AREA */}
        <div className="min-h-[280px] flex flex-col justify-center">
          {status === CallStatus.IDLE && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="text-center pb-4">
                <h1 className="text-xl font-black text-white">P2P Voice</h1>
                <p className="text-xs text-slate-500">Hemat data, koneksi langsung antar perangkat.</p>
              </div>
              <input
                type="text"
                placeholder="Tempel ID teman di sini..."
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-center text-lg font-mono focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              />
              <button
                onClick={startCall}
                disabled={!myId || !targetId}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-xl shadow-blue-900/20"
              >
                <Phone size={20} fill="currentColor" />
                <span>MULAI PANGGILAN</span>
              </button>
            </div>
          )}

          {(status === CallStatus.CONNECTING || status === CallStatus.IN_CALL) && (
            <div className="space-y-8 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                   <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                   <span>{connectionDetail || 'Menyambungkan'}</span>
                </div>
                <h3 className="text-lg font-mono font-bold text-slate-400 truncate px-4">{targetId}</h3>
              </div>

              <div className="space-y-4 px-2">
                <Visualizer stream={localStream} color="#10b981" />
                <Visualizer stream={remoteStream} color="#3b82f6" />
              </div>

              <div className="flex justify-center items-center space-x-6">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={() => handleHangup(true)}
                  className="w-18 h-18 bg-red-600 hover:bg-red-500 text-white rounded-[2rem] flex items-center justify-center transition-all shadow-xl shadow-red-900/40 transform active:scale-90"
                >
                  <PhoneOff size={32} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold uppercase tracking-tight">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>

      <div className="mt-8 flex items-center space-x-6 opacity-30 grayscale pointer-events-none">
        <Activity size={16} />
        <span className="text-[10px] font-black tracking-widest uppercase">Opus Codec 16kHz • P2P Tunneling • End-to-End</span>
      </div>
    </div>
  );
};

export default App;
