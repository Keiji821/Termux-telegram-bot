const NamsoCCGen = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    if (parts.length !== 4) {
      return bot.sendMessage(msg.chat.id, 'Error: Formato de entrada incorrecto. Uso: .gen <bin>|<mes>|<año>|<ccv>');
    }

    let [bin, month, year, ccv] = parts;

    month = (month === 'rnd' || month === 'xxx') ? getRandomMonth() : month;
    year = (year === 'rnd' || year === 'xxx') ? getRandomYear() : year;
    ccv = (ccv === 'rnd' || ccv === 'xxx') ? getRandomCCV() : ccv;

    try {
      const cardGen = new NamsoCCGen();
      const cardDetails = cardGen.getDetails(bin);

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