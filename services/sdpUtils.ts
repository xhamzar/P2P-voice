
/**
 * Modifies SDP to prefer Opus and configure it for low bandwidth.
 * We enforce mono (stereo=0) and enable DTX (Discontinuous Transmission).
 */
export function optimizeSDP(sdp: string, bitrate: number): string {
  let lines = sdp.split('\r\n');
  
  // 1. Find the Opus payload type
  // a=rtpmap:111 opus/48000/2
  const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
  if (opusMatch) {
    const pt = opusMatch[1];
    
    // 2. Add fmtp line for low bandwidth Opus
    // bitrate is in bps, Opus wants maxaveragebitrate in bps
    const fmtp = `a=fmtp:${pt} maxaveragebitrate=${bitrate};stereo=0;useinbandfec=1;usedtx=1`;
    
    // Replace existing fmtp or add new one
    lines = lines.map(line => {
      if (line.startsWith(`a=fmtp:${pt}`)) {
        return fmtp;
      }
      return line;
    });

    // 3. Add bandwidth limit line (b=AS:bitrate_in_kbps)
    const kbps = Math.floor(bitrate / 1000);
    lines.splice(lines.findIndex(l => l.startsWith('m=audio')) + 1, 0, `b=AS:${kbps}`);
  }

  return lines.join('\r\n');
}
