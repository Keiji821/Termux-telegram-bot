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

// Mostrar mensaje de inicio
const startupMessage = (bot) => {
    lolcatjs.fromString(`\n 「🟢」 El bot ${bot.username} se ha conectado correctamente!`);
};

// Manejador de comandos
const commandHandler = async (msg, prefix, bot) => {
    try {
        if (!msg.text.startsWith(prefix)) return;

        const args = msg.text.slice(prefix.length).trim().split(/ +/);  // Separar los argumentos
        const commandName = args.shift().toLowerCase();  // Obtener el nombre del comando
        let commandFile = null;

        const mainFolder = path.resolve(__dirname, 'comandos');  // Usar ruta absoluta para la carpeta comandos

        // Función recursiva para buscar archivos en subcarpetas
        const searchCommandFile = (folderPath, commandName) => {
            const files = fs.readdirSync(folderPath);  // Leer archivos de la carpeta

            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const stat = fs.statSync(filePath);  // Obtener información del archivo

                if (stat.isDirectory()) {
                    // Si es un directorio, buscar recursivamente
                    searchCommandFile(filePath, commandName);
                } else if (file === `${commandName}.js`) {
                    // Si el archivo coincide con el comando, guardar la ruta
                    commandFile = filePath;
                    return;
                }
            }
        };

        // Iniciar la búsqueda en la carpeta principal
        searchCommandFile(mainFolder, commandName);

        if (!commandFile) {
            lolcatjs.fromString(`Comando no encontrado: ${commandName}`);
            return;
        }

        const command = require(commandFile);
        if (!command.execute) {
            lolcatjs.fromString(`El comando ${commandName} no tiene una función execute`);
            return;
        }

        if (!bot) {
            lolcatjs.fromString("El bot no está definido.");
            return;
        }

        await command.execute(msg, args, bot);

    } catch (error) {
        lolcatjs.fromString(`Error al ejecutar comando: ${error}`);
        if (bot) {
            bot.sendMessage(msg.chat.id, `Error al ejecutar comando: ${error.message}`);
        } else {
            lolcatjs.fromString("El bot no está definido.");
        }
    }
};

// Función para manejar mensajes de Telegram
const handleMessage = async (msg) => {
    if (msg.from.is_bot) return;
    if (!bot) {
        lolcatjs.fromString('El bot no está definido.');
        return;
    }
    commandHandler(msg, prefixInput, bot);  // Aseguramos que 'bot' se pase a commandHandler
};

// Actualizar el código
const updateCode = async () => {
    try {
        lolcatjs.fromString('Actualizando código...');
        await exec('git pull origin main', (err, stdout, stderr) => {
            if (err) {
                lolcatjs.fromString(`Error al actualizar código: ${err}`);
                return;
            }
            lolcatjs.fromString('Código actualizado correctamente!');
            console.log(stdout);
            console.error(stderr);
            exec('node index.js', (err, stdout, stderr) => {
                if (err) {
                    lolcatjs.fromString(`Error al reiniciar el bot: ${err}`);
                    return;
                }
                console.clear();
                showMenu();
            });
        });
    } catch (error) {
        lolcatjs.fromString(`Error al actualizar código: ${error}`);
    }
};

// Menú principal
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
    lolcatjs.fromString('⸂⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⎺⸃');
    lolcatjs.fromString('▏[1] Iniciar bot');
    lolcatjs.fromString('▏[2] Actualizar');
    lolcatjs.fromString('▏[3] Instalar dependencias');
    lolcatjs.fromString('▏[4] Salir');
    lolcatjs.fromString('⸌⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⎽⸍');

    rl.setPrompt(`  ➤ `);
    rl.prompt();
};

showMenu();

rl.on('line', (option) => {
    switch (option.trim()) {
        case '1':
            rl.question('Ingrese el token del bot: ', (token) => {
                if (token === '') {
                    lolcatjs.fromString('Token inválido');
                    showMenu();
                } else {
                    bot = new TelegramBot(token, { polling: true });
                    bot.getMe().then(startupMessage);
                    bot.on('message', handleMessage);
                    rl.question('Ingrese el prefijo del bot: ', (prefix) => {
                        if (prefix === '') {
                            lolcatjs.fromString('Prefijo inválido');
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
            lolcatjs.fromString('Saliendo...');
            process.exit();
            break;
        default:
            lolcatjs.fromString('Opción inválida');
            console.clear();
            showMenu();
    }
}).on('close', () => {
    process.exit();
});