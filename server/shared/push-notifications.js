const webpush = require('web-push');
const User = require('../modules/login/models/User');

// Configurar llaves VAPID
// IMPORTANTE: Estas llaves DEBEN estar en tu archivo .env
// No usar fallbacks hardcodeados en producción
webpush.setVapidDetails(
  'mailto:info@libreria-ayc.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Envía una notificación push real a un usuario específico
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Contenido de la notificación { title, body, icon, data }
 */
const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      console.log(`⚠️ No hay suscripciones push para el usuario: ${userId}`);
      return;
    }

    const jsonPayload = JSON.stringify(payload);
    const results = [];

    // Enviar a todas las suscripciones registradas (ej. PC y Celular)
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(sub, jsonPayload);
        results.push({ success: true });
      } catch (error) {
        // Si la suscripción ha expirado o es inválida (404 o 410), eliminarla
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log('🧹 Eliminando suscripción push caducada...');
          user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
          await user.save();
        } else {
          console.error('❌ Error enviando notificación push:', error.message);
        }
      }
    }

    console.log(`📡 Notificaciones Push enviadas a ${user.name}: ${results.length}`);
  } catch (error) {
    console.error('❌ Error crítico en sendPushNotification:', error);
  }
};

module.exports = { sendPushNotification };
