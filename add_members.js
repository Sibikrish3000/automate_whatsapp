const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// This would be the ID of the target group
const GROUP_ID = "120363401780311617@g.us"; // Replace with your actual group ID

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

    // The numbers would be passed as command-line arguments from the Python script
    const numbersToAdd = process.argv.slice(2); 

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

client.initialize();