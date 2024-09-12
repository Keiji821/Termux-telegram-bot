const axios = require('axios');

// Listado de tipos de tarjetas soportadas
const cardTypes = ["visa", "mastercard", "americanexpress", "discover"];

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    // Validación del formato de entrada
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
    ccv = ccv === 'rnd' || ccv === 'xxx' ? getRandomCCV() : ccv;

    try {
      // Hacemos la solicitud a la API de verificación de BIN
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      const brand = json.brand || 'Desconocido';

      // Validamos si la marca es compatible
      if (!isSupportedBrand(brand)) {
        return bot.sendMessage(msg.chat.id, 'Advertencia: El BIN ingresado puede no ser compatible con el generador.');
      }

      const bank = json.bank || 'Desconocido';
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const countryEmoji = json.flag || '';
      const countryName = json.country || 'Desconocido';

      // Generamos 10 tarjetas usando el algoritmo de Luhn
      const cards = generateCards(bin, month, year, brand);

      // Formato del mensaje con las tarjetas generadas y la información del BIN
      const message = `
Formato: ${bin}|${month}|${year}|rnd

Tarjetas generadas:

${cards.join('\n')}

Bin Data: ${brand} - ${type} - ${level}
Bank Data: ${bank} - ${countryEmoji} - ${countryName}
      `;

      // Enviar el mensaje con botón de regeneración
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}` }] // Botón para regenerar
          ]
        }
      };

      await bot.sendMessage(msg.chat.id, message, opts);

    } catch (error) {
      console.error('Error al obtener datos de la API:', error.message);
      return bot.sendMessage(msg.chat.id, 'Error al generar tarjetas de crédito. Intente nuevamente más tarde.');
    }
  },

  // Manejador del botón de regeneración
  async handleCallbackQuery(query, bot) {
    const data = query.data.split('|');
    const command = data[0];

    if (command === 'regenerate') {
      const bin = data[1];
      const month = getRandomMonth(); // Regenerar aleatoriamente
      const year = getRandomYear();   // Regenerar aleatoriamente

      // Regenerar el mensaje con las nuevas tarjetas
      await this.execute(query.message, [bin, month, year, 'rnd'], bot);

      // Confirmar que el botón fue presionado
      await bot.answerCallbackQuery(query.id, { text: 'Tarjetas regeneradas!' });
    }
  }
};

// Función para verificar si el tipo de tarjeta es compatible
function isSupportedBrand(brand) {
  const supportedBrands = ['visa', 'mastercard', 'american express', 'discover'];
  return supportedBrands.includes(brand.toLowerCase());
}

// Generar tarjetas usando el algoritmo de Luhn
function generateCards(bin, month, year, brand) {
  const cards = [];
  const cardLength = getCardLength(brand);

  for (let i = 0; i < 10; i++) {
    const cardNumber = generateCardNumber(bin, cardLength);
    const ccv = getRandomCCV(); // Generar un CCV diferente para cada tarjeta
    cards.push(`${cardNumber}|${month}|${year}|${ccv}`);
  }

  return cards;
}

// Determinar la longitud del número de tarjeta basado en la marca
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

// Generar el número de tarjeta con el algoritmo de Luhn
function generateCardNumber(bin, length) {
  const number = bin + generateRandomDigits(length - bin.length - 1);
  return number + calculateLuhnDigit(number);
}

// Generar dígitos aleatorios
function generateRandomDigits(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

// Calcular el dígito de verificación usando el algoritmo de Luhn
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

// Generar mes aleatorio
function getRandomMonth() {
  const month = Math.floor(Math.random() * 12) + 1;
  return month.toString().padStart(2, '0');
}

// Generar año aleatorio
function getRandomYear() {
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5);
  return year.toString().slice(2);
}

// Generar CCV aleatorio
function getRandomCCV() {
  return Math.floor(100 + Math.random() * 900).toString();
}