const axios = require('axios');
const namso = require('namso-cc-gen');

module.exports = {
  name: 'gen',
  description: 'Genera tarjetas de crédito aleatorias',
  async execute(msg, args, bot) {
    const input = args.join(' ');
    const parts = input.split('|');

    // Verifica que el formato de entrada sea correcto
    if (parts.length !== 4) {
      return bot.sendMessage(msg.chat.id, 'Error: Formato de entrada incorrecto. Uso: /gen <bin>|<mes>|<año>|<ccv>');
    }

    let bin = parts[0];
    let month = parts[1];
    let year = parts[2];
    let ccv = parts[3];

    // Validar valores aleatorios si es necesario
    month = month === 'rnd' ? getRandomMonth() : month;
    year = year === 'rnd' ? getRandomYear() : year;
    ccv = ccv === 'rnd' ? getRandomCCV() : ccv;

    // Verificación de BIN usando la API
    try {
      const response = await axios.get(`https://binchk-api.vercel.app/bin=${bin}`);
      const json = response.data;

      if (!json.status) {
        return bot.sendMessage(msg.chat.id, 'Error: BIN no encontrado o inválido.');
      }

      // Datos del BIN
      const bank = json.bank || 'Desconocido';
      const brand = json.brand || 'Desconocido';
      const type = json.type || 'Desconocido';
      const level = json.level || 'Desconocido';
      const phone = json.phone || 'Desconocido';

      // Generar las tarjetas de crédito
      const cards = generateCards(year, month, bin);

      // Crear mensaje con la información generada
      const message = `
        💳 **Generador de Tarjetas**
        **Formato:** ${bin}|${month}|${year}
        **Datos del BIN:** ${brand} - ${type} - ${level}
        **Datos del Banco:** ${bank} - Tel: ${phone}
        **Tarjetas Generadas:**
        ${cards.join('\n')}
      `;

      // Enviar mensaje con las tarjetas generadas
      await bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });

      // Crear opción para regenerar tarjetas
      const opts = {
        reply_markup: {
          inline_keyboard: [[{ text: 'Regenerar Tarjetas', callback_data: `regenerate|${bin}|${month}|${year}|${ccv}` }]]
        }
      };
      await bot.sendMessage(msg.chat.id, '¿Quieres regenerar las tarjetas?', opts);

    } catch (error) {
      console.error('Error al obtener datos de la API:', error.message);
      return bot.sendMessage(msg.chat.id, 'Error al generar tarjetas de crédito. Intente nuevamente más tarde.');
    }
  },

  // Manejar la interacción del botón de regenerar
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

// Función para generar las tarjetas
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

  // Asegurarse de que las tarjetas se generen correctamente
  const cards = res.split("|").filter(card => card && card.length >= 16);
  return cards.map(card => `${card}|${month}|${year}|${getRandomCCV()}`);
}

// Funciones auxiliares para generar valores aleatorios
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