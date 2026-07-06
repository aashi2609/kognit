/**
 * Kognit — Audio Worklet Processor
 *
 * Custom AudioWorkletProcessor that captures raw PCM16 mono audio
 * at 16kHz in 250ms chunks for hyper-low streaming latency.
 *
 * This file must be loaded as a separate module via:
 *   audioContext.audioWorklet.addModule('/audio-worklet.js')
 *
 * It posts Float32Array buffers to the main thread via MessagePort.
 */

class KognitAudioProcessor extends AudioWorkletProcessor {
  /** Buffer to accumulate samples until we hit the chunk threshold */
  private buffer: Float32Array[];
  private sampleCount: number;
  private readonly CHUNK_SAMPLES: number;

  constructor() {
    super();
    this.buffer = [];
    this.sampleCount = 0;
    // 250ms of 16kHz audio = 4000 samples
    // But AudioWorklet runs at audioContext.sampleRate (usually 44100 or 48000)
    // We'll downsample to 16kHz in the main thread
    // At 48kHz, 250ms = 12000 samples
    this.CHUNK_SAMPLES = Math.floor(sampleRate * 0.25);
  }

  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Take the first channel (mono)
    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;

    // Copy the data (input buffers are recycled by the browser)
    this.buffer.push(new Float32Array(channelData));
    this.sampleCount += channelData.length;

    // When we've accumulated enough for a chunk, send it
    if (this.sampleCount >= this.CHUNK_SAMPLES) {
      const merged = this.mergeBuffers();
      this.port.postMessage({ type: 'audio_chunk', data: merged }, [merged.buffer]);
      this.buffer = [];
      this.sampleCount = 0;
    }

    return true; // Keep processor alive
  }

  private mergeBuffers(): Float32Array {
    const totalLength = this.buffer.reduce((sum, buf) => sum + buf.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of this.buffer) {
      merged.set(buf, offset);
      offset += buf.length;
    }
    return merged;
  }
}

registerProcessor('kognit-audio-processor', KognitAudioProcessor);
