const fs = require('fs');
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, CommandOptionType } = require('discord.js');
const { clientId, token } = require('./config.json');

let doctrines = require('./doctrines.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

const registerCommands = async () => {
    const managementData = {
        name: 'management',
        description: 'Manage doctrines, alliances, and ships',
        options: [
            {
                name: 'action',
                type: 3,
                description: 'What action to perform',
                required: true,
                choices: [
                    { name: 'Add Alliance', value: 'add_alliance' },
                    { name: 'Add Doctrine', value: 'add_doctrine' },
                    { name: 'Add Ship', value: 'add_ship' }
                ]
            },
            {
                name: 'alliance_name',
                type: 3,
                description: 'Name of the alliance',
                required: false
            },
            {
                name: 'doctrine_name',
                type: 3,
                description: 'Name of the doctrine',
                required: false
            },
            {
                name: 'ship_name',
                type: 3,
                description: 'Name of the ship',
                required: false
            },
            {
                name: 'fitting_details',
                type: 3,
                description: 'Fitting details for the ship',
                required: false
            }
        ]
    };

    await client.guilds.cache.get('1110843274668806165')?.commands.create(managementData);

    const doctrineData = {
        name: 'doctrine',
        description: 'Get information about an alliance doctrine',
        options: [
            {
                name: 'alliance',
                type: 3,
                description: 'Name of the alliance',
                required: true,
                choices: Object.keys(doctrines).map(alliance => ({ name: alliance, value: alliance }))
            }
        ]
    };

    await client.guilds.cache.get('1110843274668806165')?.commands.create(doctrineData);

    console.log(`Registered commands: management and doctrine`);
};

client.once('ready', () => {
    console.log('Logged in as ' + client.user.tag);
    registerCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'management') {
        const action = interaction.options.getString('action');
        const allianceName = interaction.options.getString('alliance_name');
        const doctrineName = interaction.options.getString('doctrine_name');
        const shipName = interaction.options.getString('ship_name');
        const fittingDetails = interaction.options.getString('fitting_details');

        switch (action) {
            case 'add_alliance':
                if (doctrines[allianceName]) {
                    return interaction.reply(`Alliance \`${allianceName}\` already exists.`);
                }
                doctrines[allianceName] = {};
                break;

            case 'add_doctrine':
                if (!doctrines[allianceName]) {
                    return interaction.reply(`Alliance \`${allianceName}\` doesn't exist.`);
                }
                if (doctrines[allianceName][doctrineName]) {
                    return interaction.reply(`Doctrine \`${doctrineName}\` already exists under \`${allianceName}\`.`);
                }
                doctrines[allianceName][doctrineName] = {};
                break;

            case 'add_ship':
                if (!doctrines[allianceName] || !doctrines[allianceName][doctrineName]) {
                    return interaction.reply(`Alliance \`${allianceName}\` or Doctrine \`${doctrineName}\` doesn't exist.`);
                }
                doctrines[allianceName][doctrineName][shipName] = fittingDetails;
                break;

            default:
                return interaction.reply(`Invalid action.`);
        }

        fs.writeFileSync('./doctrines.json', JSON.stringify(doctrines, null, 2));
        return interaction.reply(`Action \`${action}\` performed successfully.`);
    }

    if (interaction.commandName === 'doctrine') {
        const alliance = interaction.options.getString('alliance');
        const allianceData = doctrines[alliance];
        if (!allianceData) {
            return interaction.reply(`Invalid alliance selected.`);
        }

        const doctrinesArray = Object.keys(allianceData);
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select-doctrine-${alliance}`)
            .setPlaceholder('Select a doctrine')
            .addOptions(doctrinesArray.map(doctrine => ({
                label: doctrine,
                value: doctrine
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: `Select a doctrine for the \`${alliance}\` alliance:`, components: [row] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId.startsWith('select-doctrine-')) {
        const alliance = interaction.customId.split('-')[2];
        const selectedDoctrine = interaction.values[0];
        const allianceData = doctrines[alliance];

        if (!allianceData || !allianceData[selectedDoctrine]) {
            return interaction.update(`Invalid doctrine selected.`);
        }

        const shipsArray = Object.keys(allianceData[selectedDoctrine]);
        const shipSelectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select-ship-${alliance}-${selectedDoctrine}`)
            .setPlaceholder('Select a ship')
            .addOptions(shipsArray.map(ship => ({
                label: ship,
                value: ship
            })));

        const row = new ActionRowBuilder().addComponents(shipSelectMenu);

        await interaction.update({ content: `Select a ship from the \`${selectedDoctrine}\` doctrine of \`${alliance}\`:`, components: [row] });
    } else if (interaction.customId.startsWith('select-ship-')) {
    const splitId = interaction.customId.split('-');
    const alliance = splitId[2];
    const doctrine = splitId[3];
    const selectedShip = interaction.values[0];
    const allianceData = doctrines[alliance];
    const fitting = allianceData[doctrine][selectedShip];

    if (!fitting) {
        return interaction.update(`Invalid ship selected.`);
    }

    const formattedFitting = fitting.replace(/\\n/g, '\n');
    await interaction.update(`> Alliance: \`${alliance}\`\n> Doctrine: \`${doctrine}\`\n> Ship: \`${selectedShip}\`\n\n\`\`\`${formattedFitting}\`\`\``);
}
});

const CHANNEL_ID = '1165464041003683912';
const BOT = '1165429478261014619'; // Ensure this is the correct bot's user ID

client.on("messageCreate", async message => {
    // Check conditions
    if (message.channel.id !== CHANNEL_ID || message.author.id === BOT) return;

    // Convert the multi-line fitting to a single line
    const singleLineFitting = message.content.replace(/\n/g, '\\n');

    // Reply with the single line fitting string
    message.reply(`\`\`\`${singleLineFitting}\`\`\``); 
});

client.login(token);