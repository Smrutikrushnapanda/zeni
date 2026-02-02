// hooks/useSpeechToText.ts
import { useState, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export const useSpeechToText = () => {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Store accumulated transcript across all result events
  const accumulatedTranscript = useRef('');

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setError(null);
    accumulatedTranscript.current = ''; // Reset on start
    setTranscript('');
    console.log('🎤 Speech recognition started');
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    console.log('🛑 Speech recognition ended');
    console.log('📝 Final transcript:', accumulatedTranscript.current);
  });

  useSpeechRecognitionEvent('result', (event) => {
    console.log('📊 Result event received');
    
    if (!event.results || event.results.length === 0) {
      console.log('⚠️ No results in event');
      return;
    }
    
    // Get ALL transcripts from all results and combine them
    const allTranscripts = event.results
      .map(result => result?.transcript)
      .filter(Boolean)
      .join(' ');
    
    if (allTranscripts) {
      console.log('📝 All transcripts combined:', allTranscripts);
      accumulatedTranscript.current = allTranscripts;
      setTranscript(allTranscripts);
      setError(null);
    }
  });

  useSpeechRecognitionEvent('audiostart', () => {
    console.log('🔊 Microphone active');
  });

  useSpeechRecognitionEvent('speechstart', () => {
    console.log('🗣️ User started speaking');
  });

  useSpeechRecognitionEvent('speechend', () => {
    console.log('🤐 User paused speaking');
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Completely ignore no-speech errors
    if (event.error === 'no-speech') {
      console.log('ℹ️ No speech timeout (ignored)');
      return;
    }
    
    console.error('❌ Error:', event.error);
    setError(event.error);
    setRecognizing(false);
  });

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Zeni AI needs access to your microphone.',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const startListening = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return false;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        console.warn('Permission denied');
        return false;
      }

      // Reset everything
      accumulatedTranscript.current = '';
      setTranscript('');
      setError(null);
      
      // Start with CONTINUOUS mode (like ChatGPT)
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: true, // CRITICAL: Keeps listening through pauses
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings: ['Zeni', 'AI'],
      });

      return true;
    } catch (error) {
      console.error('Start error:', error);
      return false;
    }
  };

  const stopListening = () => {
    console.log('⏹️ Stopping (keeping transcript)');
    ExpoSpeechRecognitionModule.stop();
  };

  const abort = () => {
    console.log('❌ Aborting (clearing everything)');
    ExpoSpeechRecognitionModule.abort();
    setRecognizing(false);
    setTranscript('');
    accumulatedTranscript.current = '';
    setError(null);
  };

  return {
    recognizing,
    transcript,
    error,
    startListening,
    stopListening,
    abort,
  };
};