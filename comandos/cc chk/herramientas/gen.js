const axios = require('axios');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    if (parts.length !== 4) {
      return bot.sendMessage(msg.chat.id, 'Error: Formato de entrada incorrecto. Uso: /gen <bin>|<mes>|<año>|<ccv>');
    }

    let [bin, month, year, ccv] = parts;

    month = (month === 'rnd' || month === 'xxx') ? getRandomMonth() : month;
    year = (year === 'rnd' || year === 'xxx') ? getRandomYear() : year;
    ccv = (ccv === 'rnd' || ccv === 'xxx') ? getRandomCCV() : ccv;

    bin = generateBin(bin);

    try {
      console.log(`Fetching data for BIN: ${bin}`);
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      console.log('API Response:', json);

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
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|${month}|${year}` }]
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

  const requiredLength = length - 1; // -1 porque vamos a añadir el dígito de Luhn al final
  if (bin.length > requiredLength) {
    throw new Error(`El BIN no puede tener más de ${requiredLength} dígitos.`);
  }

  const randomDigits = generateRandomDigits(requiredLength - bin.length);
  const number = bin + randomDigits;

  if (number.length !== requiredLength) {
    throw new Error(`Error al generar el número de tarjeta: la longitud debe ser ${requiredLength}`);
  }

  return number + calculateLuhnDigit(number);
}

function generateBin(bin) {
  return bin.replace(/x/g, () => Math.floor(Math.random() * 10).toString());
}

function generateRandomDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function calculateLuhnDigit(number) {
  const digits = number.split('').map(d => parseInt(d, 10));
  let sum = 0;
  let shouldDouble = false; // Comenzar desde la derecha para el algoritmo de Luhn

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const remainder = sum % 10;
  return remainder === 0 ? '0' : (10 - remainder).toString();
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