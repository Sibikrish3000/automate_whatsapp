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
                console.log('Numbers to add:', numbersToAdd); // Debug log
                
                try {
                    const results = await group.addParticipants(numbersToAdd, {
                        // This option is useful if you want to see the sleep delays in action
                        // sleep: [250, 500] 
                    });
                    console.log('Results type:', typeof results);
                    console.log('Results length/keys:', Array.isArray(results) ? results.length : Object.keys(results).length);

                    // 5. Analyze results and send DMs to those who couldn't be added
                    console.log('Analyzing results...');
                    console.log('Raw results:', results); // Debug log
                    
                    // Check if results is an array or object
                    if (Array.isArray(results)) {
                        // Handle array format
                        results.forEach((result, index) => {
                            const phoneNumber = numbersToAdd[index];
                            const plainNumber = phoneNumber ? phoneNumber.replace(/@c.us/g, '') : `Index ${index}`;
                            
                            if (result && typeof result === 'object') {
                                if (result.code === 200) {
                                    console.log(`- SUCCESS: ${plainNumber} was added directly.`);
                                } else if (result.code === 409) {
                                    console.log(`- FAILED (Already in Group): ${plainNumber} is already a member.`);
                                } else if (result.code === 403) {
                                    console.log(`- FAILED (Privacy): Cannot add ${plainNumber}. Privacy settings prevent adding.`);
                                } else {
                                    console.log(`- FAILED (Other): Cannot add ${plainNumber}. Code: ${result.code || 'N/A'}, Message: ${result.message || 'No message'}`);
                                }
                            } else {
                                console.log(`- UNKNOWN: ${plainNumber} - Unexpected result format:`, result);
                            }
                        });
                    } else if (results && typeof results === 'object') {
                        // Handle object format where keys are phone numbers
                        for (const number in results) {
                            const result = results[number];
                            const plainNumber = number.replace(/@c.us/g, '');

                            if (result && typeof result === 'object') {
                                if (result.code === 200) {
                                    console.log(`- SUCCESS: ${plainNumber} was added directly.`);
                                } else if (result.code === 409) {
                                    console.log(`- FAILED (Already in Group): ${plainNumber} is already a member.`);
                                } else if (result.code === 403) {
                                    console.log(`- FAILED (Privacy): Cannot add ${plainNumber}. Privacy settings prevent adding.`);
                                } else {
                                    console.log(`- FAILED (Other): Cannot add ${plainNumber}. Code: ${result.code || 'N/A'}, Message: ${result.message || 'No message'}`);
                                }
                            } else {
                                console.log(`- UNKNOWN: ${plainNumber} - Unexpected result format:`, result);
                            }
                        }
                    } else {
                        console.log('Unexpected results format:', typeof results, results);
                    }
                } catch (error) {
                    console.error('Error adding participants:', error);
                }
            } else {
                console.log("No valid numbers found in the CSV file.");
            }

            console.log('All operations complete. Closing client.');
            await client.destroy();
        });
});

client.initialize();