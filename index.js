const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const readline = require('readline');
const git = require('simple-git')();
const figlet = require('figlet');
const lolcatjs = require('lolcatjs');
const path = require('path');
const { exec } = require('child_process');

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
    console.log('[32m 「🟢」 El bot ' + bot.username + ' se ha conectado correctamente!');
};


// Manejador de comandos
const commandHandler = async (msg, prefix, bot) => {
    try {
        if (!msg.text.startsWith(prefix)) return;
        const args = msg.text.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        let commandFile = null;

        const mainFolder = path.resolve(__dirname, 'comandos');  // Usa una ruta absoluta

        // Función recursiva para buscar en todas las subcarpetas
        const searchCommandFile = (folderPath, commandName) => {
            const files = fs.readdirSync(folderPath);  // Lee los archivos en la carpeta

            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const stat = fs.statSync(filePath);  // Obtiene el estado del archivo

                if (stat.isDirectory()) {
                    // Si es una carpeta, busca recursivamente en la subcarpeta
                    searchCommandFile(filePath, commandName);
                } else if (file === `${commandName}.js`) {
                    // Si es el archivo de comando correcto, asigna la ruta
                    commandFile = filePath;
                    return;
                }
            }
        };

        // Inicia la búsqueda en la carpeta principal
        searchCommandFile(mainFolder, commandName);

        if (!commandFile) {
            console.log(`[31m Comando no encontrado: ${commandName}`);
            return;
        }

        // Carga el archivo de comando
        const command = require(commandFile);
        if (!command.execute) {
            console.log(`[31m El comando ${commandName} no tiene una función execute`);
            return;
        }

        // Ejecuta el comando
        await command.execute(msg, args, bot);

    } catch (error) {
        console.error(`[31m Error al ejecutar comando: ${error}`);
        if (bot) {
            bot.sendMessage(msg.chat.id, `Error al ejecutar comando: ${error}`);
        } else {
            console.error("El bot no está definido.");
        }
    }
};



// Función para manejar mensajes de Telegram
const handleMessage = async (msg) => {
    if (msg.from.is_bot) return;
    commandHandler(msg, prefixInput);
};

const updateCode = async () => {
    try {
        console.log(`[32m Actualizando código...[0m`);
        await exec('git pull origin main', (err, stdout, stderr) => {
            if (err) {
                console.error(`[32m Error al actualizar código: ${err}[0m`);
                return;
            }
            console.log(`[32m Código actualizado correctamente![0m`);
            console.log(stdout);
            console.error(stderr);
            exec('node index.js', (err, stdout, stderr) => {
                if (err) {
                    console.error(`[31m Error al reiniciar el bot: ${err}[0m`);
                    return;
                }
                console.clear();
                showMenu();
            });
        });
    } catch (error) {
        console.error(`[31m Error al actualizar código: ${error}[0m`);
    }
};

const installDependencies = async () => {
    try {
        console.log(`[32m Instalando dependencias...[0m`);
        await exec('npm install node-telegram-bot-api', (err, stdout, stderr) => {
            if (err) {
                console.error(`[31m Error al instalar dependencias: ${err}[0m`);
                return;
            }
            console.log(`[32m Dependencias instaladas correctamente![0m`);
            console.log(stdout);
            console.error(stderr);
            console.clear();
            showMenu();
        });
    } catch (error) {
        console.error(`[31m Error al instalar dependencias: ${error}[0m`);
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

    lolcatjs.fromString(' ');
    lolcatjs.fromString('    Hecho por: Keiji821');
    lolcatjs.fromString(' ');
    lolcatjs.fromString('⸂⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⸃');
    lolcatjs.fromString('▏[1] Iniciar bot             ︳');
    lolcatjs.fromString('▏[2] Actualizar              ︳');
    lolcatjs.fromString('▏[3] Instalar dependencias   ︳');
    lolcatjs.fromString('▏[4] Salir                   ︳');
    lolcatjs.fromString('⸌⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⸍');
    lolcatjs.fromString(' ');
    rl.setPrompt(`[32m  ➤ `);
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

                    // Mover el registro de eventos aquí, después de inicializar el bot
                    bot.on('callback_query', async (query) => {
                        const data = query.data.split('|');
                        const command = data[0];
                        const handler = commandHandlers[command];
                        if (handler) {
                            await handler.handleCallbackQuery(query, bot);
                        }
                    });

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
            break;
        case '3':
            installDependencies();
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