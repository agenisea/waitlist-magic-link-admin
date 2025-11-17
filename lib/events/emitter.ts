import type { MagicLinkEvent, EventHandler } from '@/lib/types/events'

export class MagicLinkEventEmitter {
  private handlers: Map<string, Array<(data: any) => Promise<void> | void>> = new Map()

  on<T extends MagicLinkEvent['type']>(
    event: T,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler as any)
  }

  async emit(event: MagicLinkEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || []

    await Promise.allSettled(
      handlers.map(async (handler) => {
        try {
          await handler(event.data)
        } catch (error) {
          console.error(`[EventEmitter] Error in handler for ${event.type}:`, error)
        }
      })
    )
  }

  off<T extends MagicLinkEvent['type']>(
    event: T,
    handler?: EventHandler<T>
  ): void {
    if (!handler) {
      this.handlers.delete(event)
      return
    }

    const handlers = this.handlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler as any)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  removeAllListeners(): void {
    this.handlers.clear()
  }
}
