
import { useState, useCallback, useRef, useEffect } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on mount and clean up on unmount
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current || isPlaying) {
      return;
    }

    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    setIsPlaying(true);

    try {
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        audioBytes,
        audioContextRef.current,
        24000,
        1
      );
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      source.start();
      sourceNodeRef.current = source;
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      // onended will handle state changes
    }
  }, []);

  return { playAudio, stopAudio, isPlaying };
};
