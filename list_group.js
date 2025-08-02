const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Starting WhatsApp client...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // NOTE: Replace this with your ACTUAL path!
        executablePath: 'C:\\Users\\SIBIJ\\AppData\\Local\\ms-playwright\\chromium-1179\\chrome-win\\chrome.exe',
        headless: false,
    }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR Code Received! Please scan it with your phone.');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('Authentication successful!');
});

client.on('ready', async () => {
    console.log('Client is ready! Fetching chats...');

    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);

        if (groups.length === 0) {
            console.log('You are not a part of any groups.');
        } else {
            console.log('--- Found Group IDs ---');
            groups.forEach(group => {
                // The name of the group
                const groupName = group.name;
                // The unique ID for the group
                const groupId = group.id._serialized;
                
                console.log(`Name: ${groupName}`);
                console.log(`ID:   ${groupId}`);
                console.log('-------------------------');
            });
        }
    } catch (error) {
        console.error('Failed to get chats:', error);
    } finally {
        // Close the client's connection
        console.log('Task complete. Closing client.');
        await client.destroy();
    }
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

client.initialize();