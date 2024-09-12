const axios = require('axios');

const cardTypes = ["visa", "mastercard", "americanexpress", "discover"];

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

    month = month === 'rnd' || month === 'xxx' ? getRandomMonth() : month;
    year = year === 'rnd' || year === 'xxx' ? getRandomYear() : year;
    ccv = ccv === 'rnd' || ccv === 'xxx' ? getRandomCCV() : ccv;

    bin = generateBin(bin);

    try {
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const brand = json.brand || 'Desconocido';

      if (!isSupportedBrand(brand)) {
        return bot.sendMessage(msg.chat.id, 'Advertencia: El BIN ingresado puede no ser compatible con el generador.');
      }

      const bank = json.bank || 'Desconocido';
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const countryEmoji = json.flag || '';
      const countryName = json.country || 'Desconocido';

      const cards = generateCards(bin, month, year, brand);

      const message = `
Formato: ${bin}|${month}|${year}|rnd

Tarjetas generadas:

${cards.join('\n')}

Bin Data: ${brand} - ${type} - ${level}
Bank Data: ${bank} - ${countryEmoji} - ${countryName}
      `;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}` }]
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
      const month = getRandomMonth();
      const year = getRandomYear();

      await this.execute(query.message, [bin, month, year, 'rnd'], bot);

      await bot.answerCallbackQuery(query.id, { text: 'Tarjetas regeneradas!' });
    }
  }
};

function isSupportedBrand(brand) {
  const supportedBrands = ['visa', 'mastercard', 'american express', 'discover'];
  return supportedBrands.includes(brand.toLowerCase());
}

function generateCards(bin, month, year, brand) {
  const cards = [];
  const cardLength = getCardLength(brand);

  for (let i = 0; i < 10; i++) {
    const cardNumber = generateCardNumber(bin, cardLength);
    const ccv = getRandomCCV();
    cards.push(`${cardNumber}|${month}|${year}|${ccv}`);
  }

  return cards;
}

function getCardLength(brand) {
  switch (brand.toLowerCase()) {
    case 'american express':
      return 15;
    case 'visa':
    case 'mastercard':
    case 'discover':
      return 16;
    default:
      return 16;
  }
}

function generateCardNumber(bin, length) {
  if (!/^\d+$/.test(bin)) {
    throw new Error("El BIN debe ser numérico.");
  }

  const randomDigits = generateRandomDigits(length - bin.length - 1);
  const number = bin + randomDigits;

  if (number.length !== length - 1) {
    throw new Error(`Error al generar el número de tarjeta: la longitud debe ser ${length - 1}`);
  }

  return number + calculateLuhnDigit(number);
}

function generateBin(bin) {
  return bin.replace(/x/g, () => Math.floor(Math.random() * 10).toString());
}

function generateRandomDigits(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

function calculateLuhnDigit(number) {
  const digits = number.split('').map(d => parseInt(d, 10));
  let sum = 0;
  let shouldDouble = true;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
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
  return Math.floor(100 + Math.random() * 900).toString();
}