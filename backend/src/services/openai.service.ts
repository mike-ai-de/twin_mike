import OpenAI from 'openai';
import config from '../config';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import prisma from '../lib/prisma';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export class OpenAIService {
  /**
   * Speech-to-Text using Whisper API
   */
  async transcribeAudio(audioFilePath: string): Promise<{ transcript: string; duration: number }> {
    const startTime = Date.now();

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'de', // German, adjust if needed
        response_format: 'verbose_json',
      });

      const duration = (Date.now() - startTime) / 1000;

      // Track cost (Whisper: $0.006/minute)
      const audioMinutes = transcription.duration / 60;
      await this.trackCost('openai_whisper', audioMinutes, audioMinutes * 0.006);

      return {
        transcript: transcription.text,
        duration: transcription.duration,
      };
    } catch (error) {
      console.error('Whisper API error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Text-to-Speech using OpenAI TTS API
   */
  async synthesizeSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<string> {
    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3',
      });

      // Save to file
      const filename = `tts_${nanoid()}.mp3`;
      const filepath = path.join(config.UPLOAD_DIR, filename);

      const buffer = Buffer.from(await response.arrayBuffer());
      await pipeline(
        (async function* () {
          yield buffer;
        })(),
        createWriteStream(filepath)
      );

      // Track cost (TTS: $15/1M characters)
      const charCount = text.length;
      await this.trackCost('openai_tts', charCount, (charCount / 1000000) * 15);

      return `/uploads/${filename}`;
    } catch (error) {
      console.error('TTS API error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  /**
   * Chat completion with structured output
   */
  async chatCompletion(messages: OpenAI.ChatCompletionMessageParam[], options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    sessionId?: string;
  }): Promise<string> {
    const model = options?.model || 'gpt-4o';
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 2000;

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
      });

      const content = completion.choices[0].message.content || '';

      // Track cost (GPT-4o: $2.50/1M input, $10/1M output)
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const cost = (inputTokens / 1000000) * 2.5 + (outputTokens / 1000000) * 10;

      await this.trackCost('openai_gpt4', inputTokens + outputTokens, cost, options?.sessionId);

      return content;
    } catch (error) {
      console.error('Chat completion error:', error);
      throw new Error('Failed to generate completion');
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 512,
      });

      // Track cost (Embeddings: $0.02/1M tokens)
      const tokens = response.usage.total_tokens;
      await this.trackCost('openai_embedding', tokens, (tokens / 1000000) * 0.02);

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Track API costs in database
   */
  private async trackCost(service: string, units: number, costUsd: number, sessionId?: string): Promise<void> {
    try {
      await prisma.costTracking.create({
        data: {
          sessionId: sessionId || null,
          service,
          units,
          costUsd,
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Failed to track cost:', error);
      // Non-critical, don't throw
    }
  }
}

export const openaiService = new OpenAIService();
