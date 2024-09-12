const cardGen = require('@simeon979/card-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    console.log('Input recibido:', input);

    const parts = input.split('|');

    if (parts.length < 1) {
      return bot.sendMessage(msg.chat.id, 'Error: Se requiere al menos el BIN. Uso: .gen <bin>|<mes>|<año>|<ccv>');
    }

    let [bin, month, year, ccv] = parts;

    month = month || getRandomMonth();
    year = year || getRandomYear();
    ccv = ccv || getRandomCCV();

    if (bin.length < 6) {
      return bot.sendMessage(msg.chat.id, 'Error: El BIN debe tener al menos 6 dígitos.');
    }

    console.log('BIN:', bin, 'Mes:', month, 'Año:', year, 'CCV:', ccv);

    try {
      const cardDetails = cardGen.lookupCard(bin);
      console.log('Detalles del BIN:', cardDetails);

      if (!cardDetails) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const brand = cardDetails.network || 'Desconocido';
      if (!isSupportedBrand(brand)) {
        return bot.sendMessage(msg.chat.id, 'Advertencia: El BIN ingresado puede no ser compatible con el generador.');
      }

      const bank = cardDetails.issuer || 'Desconocido';
      const cards = [];
      for (let i = 0; i < 10; i++) {
        const cardNumber = cardGen.generateCard({ startsWith: bin }).number; // Ajusta el método según la documentación del paquete.
        cards.push(`${cardNumber}|${month}|${year}|${ccv}`);
      }

      const message = `
Formato: ${bin}|${month}|${year}|rnd

Tarjetas generadas:

${cards.join('\n')}

Datos del BIN: ${brand}
Banco: ${bank}
      `;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|${month}|${year}` }]
          ]
        }
      };

      await bot.sendMessage(msg.chat.id, message, opts);

    } catch (error) {
      console.error('Error al generar tarjetas de crédito:', error.message);
      return bot.sendMessage(msg.chat.id, 'Error al generar tarjetas de crédito. Intente nuevamente más tarde.');
    }
  },

  async handleCallbackQuery(query, bot) {
    const data = query.data.split('|');
    const command = data[0];

    if (command === 'regenerate') {
      const bin = data[1];
      const month = data[2];
      const year = data[3];

      await this.execute(query.message, [bin, month, year, 'rnd'], bot);

      await bot.answerCallbackQuery(query.id, { text: 'Tarjetas regeneradas!' });
    }
  }
};

function isSupportedBrand(brand) {
  const supportedBrands = ['visa', 'mastercard', 'american express', 'discover'];
  return supportedBrands.includes(brand.toLowerCase());
}

function getRandomMonth() {
  return String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
}

function getRandomYear() {
  const currentYear = new Date().getFullYear();
  return String(currentYear + Math.floor(Math.random() * 5)).slice(2);
}

function getRandomCCV() {
  return String(Math.floor(Math.random() * 900) + 100);
}