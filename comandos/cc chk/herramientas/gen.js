const axios = require('axios');
const namso = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    try {
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

      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const bank = json.bank || 'Desconocido';
      const brand = json.brand || 'Desconocido'; // Visa, Mastercard, Amex, etc.
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const countryEmoji = json.flag || '';
      const countryName = json.country || 'Desconocido';

      // Validar el tipo de tarjeta pero no bloquear BINs desconocidos
      const supportedBrands = ['Visa', 'Mastercard', 'American Express'];
      if (!supportedBrands.includes(brand)) {
        return bot.sendMessage(msg.chat.id, 'Advertencia: El BIN ingresado puede no ser compatible con el generador.');
      }

      // Generar las tarjetas con valores aleatorios para CCV si es 'rnd' o 'xxx'
      const cards = generateCards(year, month, bin, ccv, brand); // Se pasa la marca

      const message = `
Formato: ${bin}|${month}|${year}|${ccv}

Tarjetas generadas:

${cards.join('\n')}

Bin Data: ${brand} - ${type} - ${level}
Bank Data: ${bank} - ${countryEmoji} - ${countryName}
      `;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|${month}|${year}|${ccv}` }] // Forzar regeneración aleatoria
          ]
        }
      };

      await bot.sendMessage(msg.chat.id, message, opts);

    } catch (error) {
      console.error('Error en el comando /gen:', error.message);
      bot.sendMessage(msg.chat.id, 'Hubo un error al generar las tarjetas. Inténtalo de nuevo.');
    }
  },

  async handleCallbackQuery(query, bot) {
    try {
      const data = query.data.split('|');
      const command = data[0];

      if (command === 'regenerate') {
        const bin = data[1];
        const month = getRandomMonth(); // Regenerar aleatoriamente
        const year = getRandomYear();   // Regenerar aleatoriamente
        const ccv = getRandomCCV();     // Regenerar aleatoriamente

        // Enviar un nuevo mensaje con las tarjetas regeneradas
        await this.execute(query.message, [bin, month, year, ccv], bot);

        // Confirmar que el botón ha sido presionado
        await bot.answerCallbackQuery(query.id, { text: 'Tarjetas regeneradas!' });
      }
    } catch (error) {
      console.error('Error en handleCallbackQuery:', error.message);
      bot.answerCallbackQuery(query.id, { text: 'Error al procesar la solicitud.' });
    }
  }
};

function generateCards(year, month, bin, ccv, brand) {
  // Generar tarjetas aleatoriamente con valores de CCV distintos si se especifica 'rnd'
  const cards = [];
  let cardLength = 16; // Longitud estándar

  // Ajustar longitud de la tarjeta dependiendo de la marca
  if (brand === 'American Express') {
    cardLength = 15;
  }

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
    }).trim().split('|')[0];

    // Validar que la tarjeta generada tiene la longitud correcta
    if (cardNumber.length === cardLength) {
      cards.push(`${cardNumber}|${month}|${year}|${cardCCV}`);
    } else {
      console.error(`Error: No se pudo generar un número de tarjeta válido para ${brand}.`);
      cards.push('Error: No se pudo generar un número válido.');
    }
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