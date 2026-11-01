// Replaces src/services/socket.ts in the phone build: same calls as Socket.IO,
// carried by lb-phone and FiveM events.

type Handler = (...args: any[]) => void;

interface LbPhoneGlobals {
  fetchNui(event: string, data?: unknown): Promise<unknown>;
  onNuiEvent?: (event: string, handler: (data: string) => void) => void;
}

const lbPhone = globalThis as unknown as LbPhoneGlobals;

const CONNECT_RETRY_MS = 2000;
const MAX_QUEUED_MESSAGES = 50;

function decode(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

class PhoneSocket {
  connected = false;
  private handlers = new Map<string, Set<Handler>>();
  private acks = new Map<number, Handler>();
  private nextAck = 1;
  private queue: string[] = [];
  private parts = new Map<string, string[]>();
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (lbPhone.onNuiEvent) {
      lbPhone.onNuiEvent('josky', part => this.receivePart(part));
    } else {
      window.addEventListener('message', event => {
        if (event.data?.action === 'josky') this.receivePart(event.data.data);
      });
    }
    this.connect();
  }

  connect() {
    if (this.connected) return;
    const request = () => void lbPhone.fetchNui('josky:connect').catch(() => {});
    request();
    if (!this.retryTimer) this.retryTimer = setInterval(request, CONNECT_RETRY_MS);
  }

  disconnect() {
    this.connected = false;
    this.stopRetrying();
    void lbPhone.fetchNui('josky:disconnect').catch(() => {});
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string) {
    this.handlers.delete(event);
  }

  emit(event: string, ...args: unknown[]) {
    const ack = args.find(arg => typeof arg === 'function') as Handler | undefined;
    const data = args.find(arg => typeof arg === 'object');
    const message: { event: string; data?: unknown; ack?: number } = { event, data };
    if (ack) {
      message.ack = this.nextAck++;
      this.acks.set(message.ack, ack);
    }

    const text = JSON.stringify(message);
    if (this.connected) {
      this.post(text);
    } else if (this.queue.length < MAX_QUEUED_MESSAGES) {
      this.queue.push(text);
    }
  }

  private post(message: string) {
    void lbPhone.fetchNui('josky:event', { message }).catch(() => {});
  }

  private stopRetrying() {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = null;
  }

  private fire(event: string, args: unknown[] = []) {
    this.handlers.get(event)?.forEach(handler => handler(...args));
  }

  private receivePart(part: string) {
    const [id, index, total, body] = part.split(':');
    const received = this.parts.get(id) ?? [];
    received[Number(index)] = body;
    this.parts.set(id, received);
    if (Object.keys(received).length < Number(total)) return;

    this.parts.delete(id);
    this.receive(JSON.parse(decode(received.join(''))));
  }

  private receive(message: { type: string; event?: string; args?: unknown[]; id?: number; response?: unknown }) {
    if (message.type === 'connected') {
      this.connected = true;
      this.stopRetrying();
      this.queue.splice(0).forEach(text => this.post(text));
      this.fire('connect');
    } else if (message.type === 'ack') {
      const ack = this.acks.get(message.id!);
      this.acks.delete(message.id!);
      ack?.(message.response);
    } else if (message.event) {
      this.fire(message.event, message.args);
    }
  }
}

let socket: PhoneSocket | null = null;

export function getSocket() {
  socket ??= new PhoneSocket();
  return socket;
}
