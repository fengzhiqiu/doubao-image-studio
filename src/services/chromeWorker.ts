import type { WorkerMessage, ModelId, AspectRatio } from '../types';

export class ChromeWorker {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, (data: unknown) => void>();
  private reconnectTimer: number | null = null;

  connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[ChromeWorker] Connected');
      this.scheduleHeartbeat();
    };

    this.ws.onmessage = (e) => this.handleMessage(e.data);

    this.ws.onclose = () => {
      console.log('[ChromeWorker] Disconnected');
      this.scheduleReconnect(url);
    };

    this.ws.onerror = (err) => {
      console.error('[ChromeWorker] Error', err);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private handleMessage(data: string) {
    try {
      const msg: WorkerMessage = JSON.parse(data);
      if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
        const resolve = this.pendingRequests.get(msg.requestId)!;
        resolve(msg);
        this.pendingRequests.delete(msg.requestId);
      }
    } catch (e) {
      console.warn('[ChromeWorker] Invalid message', e);
    }
  }

  async generateImage(
    prompt: string,
    model: ModelId,
    aspectRatio: AspectRatio
  ): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const requestId = crypto.randomUUID();
    const msg: WorkerMessage = {
      type: 'GENERATE',
      requestId,
      model,
      data: { prompt, aspect_ratio: aspectRatio },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Timeout'));
      }, 240000);

      this.pendingRequests.set(requestId, (data) => {
        clearTimeout(timeout);
        const msg = data as WorkerMessage;
        if (msg.type === 'ERROR') {
          reject(new Error(msg.error ?? 'Unknown error'));
        } else {
          resolve((msg.data as { url: string }).url);
        }
      });

      this.ws!.send(JSON.stringify(msg));
    });
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.connect(url);
      this.reconnectTimer = null;
    }, 5000);
  }

  private scheduleHeartbeat() {
    const interval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      } else {
        clearInterval(interval);
      }
    }, 30000);
  }
}

export const chromeWorker = new ChromeWorker();
