const axios = require('axios');
const namso = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    if (parts.length !== 4) {
      return bot.sendMessage(msg.chat.id, 'Error: Formato de entrada incorrecto. Uso: /gen <bin>|<mes>|<año>|<ccv>');
    }

    let bin = parts[0];
    let month = parts[1];
    let year = parts[2];
    let ccv = parts[3];

    // Generar aleatoriamente si se especifica 'rnd' o 'xxx'
    month = month === 'rnd' || month === 'xxx' ? getRandomMonth() : month;
    year = year === 'rnd' || year === 'xxx' ? getRandomYear() : year;

    try {
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const bank = json.bank || 'Desconocido';
      const brand = json.brand || 'Desconocido';
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const countryEmoji = json.flag || '';
      const countryName = json.country || 'Desconocido';

      // Generar las tarjetas con valores aleatorios para CCV si es 'rnd' o 'xxx'
      const cards = generateCards(year, month, bin, ccv);

      const message = `
Card Generator
Formato: ${bin}|${month}|${year}|${ccv}

${cards.join('\n')}

Generated Cards

Bin Data: ${brand} - ${type} - ${level}
Bank Data: ${bank} - ${countryEmoji} - ${countryName}
      `;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|rnd|rnd|rnd` }] // Forzar regeneración aleatoria
          ]
        }
      };

      await bot.sendMessage(msg.chat.id, message, opts);

    } catch (error) {
      console.error('Error al obtener datos de la API:', error.message);
      return bot.sendMessage(msg.chat.id, 'Error al generar tarjetas de crédito. Intente nuevamente más tarde.');
    }
  },

  async handleCallbackQuery(query, bot) {
    const data = query.data.split('|');
    const command = data[0];

    if (command === 'regenerate') {
      const bin = data[1];
      const month = data[2] === 'rnd' ? getRandomMonth() : data[2];
      const year = data[3] === 'rnd' ? getRandomYear() : data[3];
      const ccv = data[4] === 'rnd' ? 'rnd' : data[4];  // Mantener "rnd" para CCV aleatorio

      // Llamamos de nuevo a execute para regenerar las tarjetas
      this.execute(query.message, [bin, month, year, ccv], bot);
    }
  }
};

function generateCards(year, month, bin, ccv) {
  // Generar tarjetas aleatoriamente con valores de CCV distintos si se especifica 'rnd'
  const cards = [];

  for (let i = 0; i < 10; i++) {
    let cardCCV = ccv === 'rnd' ? getRandomCCV() : ccv; // CCV aleatorio por tarjeta
    let cardNumber = namso.gen({
      ShowCCV: true,
      CCV: cardCCV,
      ShowExpDate: true,
      ShowBank: false,
      Month: month,
      Year: year,
      Quantity: '1',
      Bin: bin,
      Format: 'PIPE'
    }).trim().split('|')[0];  // Corregir para que no se repitan los datos

    cards.push(`${cardNumber}|${month}|${year}|${cardCCV}`);
  }

  return cards;
}

function getRandomMonth() {
  const month = Math.floor(Math.random() * 12) + 1;
  return month.toString().padStart(2, '0');
}

function getRandomYear() {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5);
  return year.toString().slice(2);
}

function getRandomCCV() {
  return Math.floor(100 + Math.random() * 900).toString();  // CCV aleatorio de 3 dígitos
}