'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { sessions } from '@/lib/api';

type Turn = {
  id: string;
  speaker: 'agent' | 'user';
  transcript: string;
  timestamp: string;
};

export default function InterviewPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadSession();
    requestMicrophonePermission();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await sessions.get(sessionId);
      setTurns(res.data.session.turns);
    } catch (err) {
      setError('Failed to load session');
      console.error(err);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone permission denied');
      console.error(err);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('listening');
    } catch (err) {
      setError('Failed to start recording');
      console.error(err);
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    try {
      // Upload audio and get transcript
      const turnRes = await sessions.addTurn(sessionId, audioBlob);

      const userTurn: Turn = {
        id: turnRes.data.turn.id,
        speaker: 'user',
        transcript: turnRes.data.turn.transcript,
        timestamp: turnRes.data.turn.timestamp,
      };

      setTurns(prev => [...prev, userTurn]);

      // Get agent's next question
      const nextRes = await sessions.getNextQuestion(sessionId);

      const agentTurn: Turn = {
        id: Date.now().toString(),
        speaker: 'agent',
        transcript: nextRes.data.question,
        timestamp: new Date().toISOString(),
      };

      setTurns(prev => [...prev, agentTurn]);

      // Play agent's response
      if (nextRes.data.audioUrl) {
        await playAudio(nextRes.data.audioUrl);
      }

      setStatus('idle');
    } catch (err) {
      setError('Failed to process recording');
      console.error(err);
      setStatus('idle');
    }
  };

  const playAudio = async (audioUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      setStatus('speaking');
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onended = () => {
        setStatus('idle');
        setCurrentAudio(null);
        resolve();
      };

      audio.onerror = (err) => {
        setStatus('idle');
        setCurrentAudio(null);
        reject(err);
      };

      audio.play();
    });
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setStatus('idle');
    }
  };

  const handlePushToTalk = () => {
    if (status === 'idle') {
      startRecording();
    } else if (status === 'listening') {
      stopRecording();
    } else if (status === 'speaking') {
      stopAudio();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Interview Session</h1>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {turns.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Press and hold the button to start talking</p>
            </div>
          )}

          {turns.map((turn) => (
            <MessageBubble key={turn.id} turn={turn} />
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-3">
          <p className="text-red-800 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Push-to-Talk Button */}
      <div className="bg-white border-t border-gray-200 px-4 py-6">
        <div className="max-w-4xl mx-auto flex justify-center">
          <button
            onMouseDown={handlePushToTalk}
            onMouseUp={handlePushToTalk}
            onTouchStart={handlePushToTalk}
            onTouchEnd={handlePushToTalk}
            disabled={status === 'processing'}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              status === 'listening'
                ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                : status === 'processing'
                ? 'bg-yellow-500 text-white'
                : status === 'speaking'
                ? 'bg-blue-500 text-white animate-pulse'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
            }`}
          >
            {status === 'listening' ? '⏸' : status === 'processing' ? '⏳' : status === 'speaking' ? '🔊' : '🎤'}
          </button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-3">
          {status === 'idle' && 'Press and hold to speak'}
          {status === 'listening' && 'Release to send'}
          {status === 'processing' && 'Processing...'}
          {status === 'speaking' && 'Agent speaking...'}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    idle: 'bg-gray-100 text-gray-800',
    listening: 'bg-red-100 text-red-800',
    processing: 'bg-yellow-100 text-yellow-800',
    speaking: 'bg-blue-100 text-blue-800',
  };

  const labels = {
    idle: 'Ready',
    listening: 'Listening',
    processing: 'Processing',
    speaking: 'Speaking',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function MessageBubble({ turn }: { turn: Turn }) {
  const isAgent = turn.speaker === 'agent';

  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isAgent
            ? 'bg-white border border-gray-200 text-gray-900'
            : 'bg-primary-600 text-white'
        }`}
      >
        <p className="text-sm font-medium mb-1">{isAgent ? 'Agent' : 'You'}</p>
        <p className="whitespace-pre-wrap">{turn.transcript}</p>
        <p className={`text-xs mt-2 ${isAgent ? 'text-gray-500' : 'text-primary-100'}`}>
          {new Date(turn.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
