const axios = require('axios');
const namso = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    if (parts.length !== 4) {
      return bot.sendMessage(msg.chat.id, 'Error: Formato de entrada incorrecto. Uso: /gen <bin>|<mes>|<año>|<ccv>', { parse_mode: 'MarkdownV2' });
    }

    let bin = parts[0];
    let month = parts[1];
    let year = parts[2];
    let ccv = parts[3];

    month = month === 'rnd' ? getRandomMonth() : month;
    year = year === 'rnd' ? getRandomYear() : year;
    ccv = ccv === 'rnd' ? getRandomCCV() : ccv;

    try {
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.', { parse_mode: 'MarkdownV2' });
      }

      const bank = json.bank || 'Desconocido';
      const brand = json.brand || 'Desconocido';
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const countryEmoji = json.flag || '';
      const countryName = json.country || 'Desconocido';

      const cards = generateCards(year, month, bin);

      // Escapando caracteres especiales para MarkdownV2
      const message = `
*Card Generator*
\`Formato:\` ${escapeMarkdown(bin)}|${escapeMarkdown(month)}|${escapeMarkdown(year)}|${escapeMarkdown(ccv)}

${cards.map(card => `\`${escapeMarkdown(card)}\``).join('\n')}

*Generated Cards*

*Bin Data:* ${escapeMarkdown(brand)} - ${escapeMarkdown(type)} - ${escapeMarkdown(level)}
*Bank Data:* ${escapeMarkdown(bank)} - ${countryEmoji} - ${escapeMarkdown(countryName)}
      `;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|${month}|${year}|${ccv}` }]
          ]
        },
        parse_mode: 'MarkdownV2' // Cambiamos a MarkdownV2
      };

      await bot.sendMessage(msg.chat.id, message, opts);

    } catch (error) {
      console.error('Error al obtener datos de la API:', error.message);
      return bot.sendMessage(msg.chat.id, 'Error al generar tarjetas de crédito. Intente nuevamente más tarde.', { parse_mode: 'MarkdownV2' });
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
      this.execute(query.message, [bin, month, year, ccv], bot);
    }
  }
};

function generateCards(year, month, bin) {
  const res = namso.gen({
    ShowCCV: true,
    ShowExpDate: true,
    ShowBank: false,
    Month: month,
    Year: year,
    Quantity: 10,
    Bin: bin,
    Format: "PIPE"
  });

  // Limpieza de tarjetas para evitar "undefined"
  const cards = res.split("|").filter(card => card && card.length >= 16);
  return cards.map(card => `${card}|${month}|${year}|${getRandomCCV()}`);
}

// Función para escapar caracteres especiales para MarkdownV2
function escapeMarkdown(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
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