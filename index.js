const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const readline = require('readline');
const git = require('simple-git')();
var figlet = require("figlet");
const lolcatjs = require('lolcatjs');
const gradient = require('gradient-string');

lolcatjs.options.seed = Math.round(Math.random() * 1000);
lolcatjs.options.colors = true;

let bot;
let prefixInput = '';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const colors = {
    reset: '[0m',
    fg: {
        red: '[31m',
        green: '[32m',
    }
};

// Mostrar mensaje de inicio
const startupMessage = (bot) => {
    console.log(' ');
    console.log('[32m[1m 「🟢」 El bot ' + bot.username + ' se ha conectado correctamente! [0m');
};


// Manejador de comandos
const commandHandler = async (msg, prefix) => {
    try {
        if (!msg.text.startsWith(prefix)) return;
        const args = msg.text.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        let commandFile = null;

        // Carpeta principal donde se encuentran todos los comandos
        const mainFolder = './comandos';

        // Función recursiva para buscar en subcarpetas
        const searchCommandFile = (folderPath, commandName) => {
            const files = fs.readdirSync(folderPath);

            for (const file of files) {
                const filePath = path.join(folderPath, file);
                if (fs.statSync(filePath).isDirectory()) {
                    // Recursivamente buscar en subcarpetas
                    searchCommandFile(filePath, commandName);
                } else if (file === `${commandName}.js`) {
                    commandFile = filePath;
                    return;
                }
            }
        };

        searchCommandFile(mainFolder, commandName);

        if (!commandFile) {
            console.log('[31m Comando no encontrado: ' + commandName + '[0m');
            return;
        }

        const command = require(commandFile);
        if (!command.execute) {
            console.log('[33m El comando ' + commandName + ' no tiene una función execute[0m');
            return;
        }

        await command.execute(msg, args, bot);
    } catch (error) {
        console.error('[31m Error al ejecutar comando: ' + error + '[0m');
        bot.sendMessage(msg.chat.id, `Error al ejecutar comando: ${error}`);
    }
};



// Función para manejar mensajes de Telegram
const handleMessage = async (msg) => {
    if (msg.from.is_bot) return;
    commandHandler(msg, prefixInput);
};

const { exec } = require('child_process');

const updateCode = async () => {
    try {
        console.log(`[32m Actualizando código...[0m`);
        await exec('git pull origin main');
        console.log(`[32m Código actualizado correctamente![0m`);
        await exec('node index.js');
        console.clear(); 
        showMenu(); 
    } catch (error) {
        console.error(`[31m Error al actualizar código: ${error}[0m`);
    }
};

const installDependencies = async () => {
    try {
        console.log(`[32m Instalando dependencias...[0m`);
        await exec('npm install node-telegram-bot-api');
        console.log(`[32m Dependencias instaladas correctamente![0m`);
        console.clear();
        showMenu();
    } catch (error) {
        console.error(`[31m Error al instalar dependencias: ${error}[0m`);
    }
};

// Menú 
const showMenu = () => { 
    console.clear();

    lolcatjs.fromString(
        figlet.textSync("TgBot", {
            font: "Slant",
            horizontalLayout: "default",
            verticalLayout: "default",
            width: 80,
            whitespaceBreak: true,
        })
    );

    lolcatjs.fromString('    Hecho por: Keiji821');
    lolcatjs.fromString(' ');
    lolcatjs.fromString('⸂⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⸃');
    lolcatjs.fromString('▏[1] Iniciar bot             ︳');
    lolcatjs.fromString('▏[2] Actualizar              ︳');
    lolcatjs.fromString('▏[3] Instalar dependencias   ︳');
    lolcatjs.fromString('▏[4] Salir                   ︳');
    lolcatjs.fromString('⸌⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⸍');
    lolcatjs.fromString(' ');
    rl.setPrompt(`[32m[1m  ➤ `);
    lolcatjs.fromString(' ');
    rl.prompt(); 
};

showMenu();

rl.on('line', (option) => {
    switch (option.trim()) {
        case '1':
            rl.question('Ingrese el token del bot: ', (token) => {
                if (token === '') {
                    console.log('Token inválido');
                    showMenu();
                } else {
                    bot = new TelegramBot(token, { polling: true });
                    bot.getMe().then(startupMessage);
                    bot.on('message', handleMessage);
                    rl.question('Ingrese el prefijo del bot: ', (prefix) => {
                        if (prefix === '') {
                            console.log('Prefijo inválido');
                            showMenu();
                        } else {
                            prefixInput = prefix;
                            showMenu();
                        }
                    });
                }
            });
            break;
        case '2':
            updateCode();
            showMenu();
            break;
        case '3':
            installDependencies();
            showMenu();
            break;
        case '4':
            console.log('Saliendo...');
            process.exit();
            break;
        default:
            console.log('Opción inválida');
            console.clear();
            showMenu();
    }
}).on('close', () => {
    process.exit();
});
