const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// The name of the group you want to find the ID for
const groupNameToFind = "UMS PROJECT TEAM"; // <-- Replace with your group's name

const client = new Client({
    authStrategy: new LocalAuth(),
      puppeteer: {
        // NOTE: Replace this with your ACTUAL path!
        executablePath: 'C:\\Users\\SIBIJ\\AppData\\Local\\ms-playwright\\chromium-1179\\chrome-win\\chrome.exe',
        headless: false,
    }
});

client.on('qr', (qr) => {
    // Generates a QR code in the terminal to link your phone
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');

    try {
        const chats = await client.getChats();
        const group = chats.find(chat => chat.name === groupNameToFind && chat.isGroup);

        if (group) {
            console.log(`Group Found: '${group.name}'`);
            console.log(`Group ID: ${group.id._serialized}`);
        } else {
            console.log(`Group with name '${groupNameToFind}' not found.`);
        }
    } catch (error) {
        console.error('Error fetching chats:', error);
    } finally {
        await client.destroy();
    }
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.initialize();