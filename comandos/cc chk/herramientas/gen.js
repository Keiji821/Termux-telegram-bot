const NamsoCCGen = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    console.log('Input recibido:', input); // Depuración: Imprimir entrada

    const parts = input.split('|');

    // Validar que al menos se proporcione el BIN
    if (parts.length < 1) {
      return bot.sendMessage(msg.chat.id, 'Error: Se requiere al menos el BIN. Uso: .gen <bin>|<mes>|<año>|<ccv>');
    }

    let [bin, month, year, ccv] = parts;

    // Completar datos si no se proporcionan
    month = month || getRandomMonth();
    year = year || getRandomYear();
    ccv = ccv || getRandomCCV();

    // Validar longitud del BIN
    if (bin.length < 6) {
      return bot.sendMessage(msg.chat.id, 'Error: El BIN debe tener al menos 6 dígitos.');
    }

    console.log('BIN:', bin, 'Mes:', month, 'Año:', year, 'CCV:', ccv); // Depuración: Imprimir parámetros

    try {
      const cardGen = new NamsoCCGen();
      const cardDetails = cardGen.getDetails(bin);
      console.log('Detalles del BIN:', cardDetails); // Depuración: Imprimir detalles del BIN

      if (!cardDetails) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const brand = cardDetails.brand || 'Desconocido';
      if (!isSupportedBrand(brand)) {
        return bot.sendMessage(msg.chat.id, 'Advertencia: El BIN ingresado puede no ser compatible con el generador.');
      }

      const bank = cardDetails.bank || 'Desconocido';
      const type = cardDetails.type || 'Desconocido';
      const level = cardDetails.level || 'Desconocido';
      const countryEmoji = cardDetails.flag || '';
      const countryName = cardDetails.country || 'Desconocido';

      const cards = [];
      for (let i = 0; i < 10; i++) {
        const cardNumber = cardGen.generate(bin).number;
        cards.push(`${cardNumber}|${month}|${year}|${ccv}`);
      }

      const message = `
Formato: ${bin}|${month}|${year}|rnd

Tarjetas generadas:

${cards.join('\n')}

Datos del BIN: ${brand} - ${type} - ${level}
Banco: ${bank} - ${countryEmoji} - ${countryName}
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