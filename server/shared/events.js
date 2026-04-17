// server/shared/events.js
const EventEmitter = require('events');

class ModuleEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Emitir evento asíncrono (espera a todos los listeners)
   * @param {string} event - Nombre del evento
   * @param {any} data - Datos del evento
   * @returns {Promise<Array>} Resultados de todos los listeners
   */
  async emitAsync(event, data) {
    const listeners = this.listeners(event);
    if (listeners.length === 0) {
      return { success: true, noListeners: true, event };
    }

    const results = await Promise.allSettled(
      listeners.map(fn => fn(data))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`❌ Evento "${event}" tuvo ${failed.length} fallos:`, failed);
    }

    return { success: true, results, event };
  }

  /**
   * Emitir evento síncrono (no espera)
   * @param {string} event - Nombre del evento
   * @param {any} data - Datos del evento
   */
  emitSync(event, data) {
    super.emit(event, data);
  }
}

// Singleton - una sola instancia para toda la app
const eventBus = new ModuleEventBus();

module.exports = eventBus;