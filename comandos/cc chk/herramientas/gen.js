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

    // Verificamos si el mes, año o ccv deben ser aleatorios
    month = month === 'rnd' || month === 'xxx' ? getRandomMonth() : month;
    year = year === 'rnd' || year === 'xxx' ? getRandomYear() : year;
    ccv = ccv === 'rnd' || ccv === 'xxx' ? 'rnd' : ccv;  // El valor "rnd" para que la librería genere CCV aleatorio

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

      // Generamos las tarjetas
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
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|rnd|rnd|rnd` }] // Forzamos a valores aleatorios en la regeneración
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
      const ccv = data[4];
      
      // Forzamos a usar valores aleatorios en la regeneración si se especifica 'rnd'
      const args = [
        bin,
        month === 'rnd' ? getRandomMonth() : month,
        year === 'rnd' ? getRandomYear() : year,
        ccv === 'rnd' ? getRandomCCV() : ccv
      ];
      
      this.execute(query.message, args, bot);
    }
  }
};

function generateCards(year, month, bin, ccv) {
  // Utilizamos la API de namso para generar las tarjetas con el formato PIPE
  const res = namso.gen({
    ShowCCV: true,
    CCV: ccv, // Aquí "rnd" si queremos generar un CCV aleatorio
    ShowExpDate: true,
    ShowBank: false,
    Month: month,
    Year: year,
    Quantity: '10',
    Bin: bin,
    Format: 'PIPE'
  });

  // No necesitamos hacer split ya que el resultado es correctamente formateado con |
  const cards = res.split('\n').filter(card => card.length > 0); // Filtramos tarjetas vacías
  
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
  return Math.floor(100 + Math.random() * 900).toString();  // Generamos un CCV aleatorio de 3 dígitos
}