'use client';

import { Circle, Square } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * One-click session recorder for demo proof. Uses the browser's native
 * getDisplayMedia + MediaRecorder — no dependencies, no server. Captures the
 * screen/tab and downloads a .webm when stopped. Works in a real browser on
 * localhost (not in headless automation).
 */
export function RecordButton() {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swarm-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      // If the user stops sharing from the browser chrome, finalize.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mr.state !== 'inactive') mr.stop();
      });
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error('Screen recording was not started:', err);
    }
  };

  const stop = () => recRef.current?.stop();

  return (
    <button
      className="btn btn--ghost"
      onClick={recording ? stop : start}
      title={recording ? 'Stop and download the recording' : 'Record this session (screen capture)'}
    >
      {recording ? (
        <>
          <Square size={14} fill="#ff3b30" color="#ff3b30" /> Stop &amp; save
        </>
      ) : (
        <>
          <Circle size={14} fill="#ff3b30" color="#ff3b30" /> Record
        </>
      )}
    </button>
  );
}
