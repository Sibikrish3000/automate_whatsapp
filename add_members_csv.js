const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

// --- Configuration ---
const GROUP_ID = "120363421307176870@g.us"; // Replace with your actual group ID
const CSV_FILE_PATH = 'contacts.csv';
const COUNTRY_CODE = '91';

// --- Safety Delay (IMPORTANT!) ---
// Min and max delay in seconds between sending DMs to avoid getting banned
const MIN_DELAY_S = 5;
const MAX_DELAY_S = 15;
// --------------------

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Users\\SIBIJ\\AppData\\Local\\ms-playwright\\chromium-1179\\chrome-win\\chrome.exe',
        headless: false, // Set to true for background execution
        args: ['--no-sandbox'],
    }
});

// Helper function for creating a random delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.on('qr', (qr) => {
    console.log('QR Code Received! Please scan it with your phone.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');
    
    // 1. Get the group chat object
    let group;
    try {
        group = await client.getChatById(GROUP_ID);
        if (!group.isGroup) {
            console.error('Error: The provided ID does not belong to a group.');
            return;
        }
    } catch (e) {
        console.error('Error: Could not find group. Is the GROUP_ID correct?', e);
        return;
    }
    
    // 2. Get the group invite link
    console.log(`Fetching invite code for group: "${group.name}"`);
    const inviteCode = await group.getInviteCode();
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
    console.log(`Invite link for group "${group.name}": ${inviteLink}`);
    const inviteMessage = `Hello! We can't add you to the group cuz of privacy settings. Please join the "${group.name}" group using this invite link:\n\n${inviteLink}`;
    console.log('Successfully fetched invite link.');

    // 3. Read numbers from CSV
    const numbersToAdd = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
            if (row.number && row.number.trim().length > 0) {
                const formattedNumber = `${COUNTRY_CODE}${row.number.trim()}@c.us`;
                numbersToAdd.push(formattedNumber);
            }
        })
        .on('end', async () => {
            console.log(`CSV file processed. Found ${numbersToAdd.length} numbers.`);

            if (numbersToAdd.length > 0) {
                // 4. Attempt to add all participants
                console.log(`Attempting to add ${numbersToAdd.length} members...`);
                const results = await group.addParticipants(numbersToAdd, {
                    // This option is useful if you want to see the sleep delays in action
                    // sleep: [250, 500] 
                });

                // 5. Analyze results and send DMs to those who couldn't be added
                console.log('Analyzing results and sending DM invitations where needed...');
                for (const number in results) {
                    const result = results[number];
                    const plainNumber = number.replace(/@c.us/g, '');

                    if (result.code === 200) {
                        console.log(`- SUCCESS: ${plainNumber} was added directly.`);
                    }
                    else if (result.code === 409) {
                        console.log(`- FAILED (Already in Group): ${plainNumber} is already a member.`);
                    } else if (result.code === 403) {
                        console.log(`- FAILED (Privacy): Cannot add ${plainNumber}. Sending DM...`);
                        try {
                            await client.sendMessage(number, inviteMessage);
                            console.log(`  - DM sent successfully to ${plainNumber}.`);
                            
                            // *** CRUCIAL DELAY ***
                            const delay = (Math.floor(Math.random() * (MAX_DELAY_S - MIN_DELAY_S + 1)) + MIN_DELAY_S) * 1000;
                            console.log(`  - Waiting for ${delay / 1000} seconds before next DM...`);
                            await sleep(delay);
                            
                        } catch (e) {
                            console.error(`  - FAILED to send DM to ${plainNumber}:`, e.message);
                        }
                    } else {
                        console.log(`- FAILED (Other): Cannot add ${plainNumber}. Code: ${result.code}, Message: ${result.message}`);
                    }
                }
            } else {
                console.log("No valid numbers found in the CSV file.");
            }

            console.log('All operations complete. Closing client.');
            await client.destroy();
        });
});

client.initialize();