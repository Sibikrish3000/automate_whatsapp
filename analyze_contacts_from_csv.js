const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

// --- Configuration ---
const CSV_FILE_PATH = 'contacts.csv';
const COUNTRY_CODE = '91';

// --- Safety Delay (IMPORTANT!) ---
const DELAY_BETWEEN_CONTACTS_S = 1;
// --------------------

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Users\\SIBIJ\\AppData\\Local\\ms-playwright\\chromium-1179\\chrome-win\\chrome.exe',
        headless: false,
        args: ['--no-sandbox'],
    }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.on('qr', (qr) => {
    console.log('QR Code Received! Please scan it with your phone.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');
    
    const contactsToAdd = [];
    let index = 0;
    
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
            if (row.number && row.number.trim().length > 0) {
                const phoneNumber = row.number.trim();
                const formattedNumber = `${COUNTRY_CODE}${phoneNumber}`;
                const contactName = `number${index}`;
                
                contactsToAdd.push({
                    phoneNumber: formattedNumber,
                    name: contactName,
                    originalIndex: index
                });
                index++;
            }
        })
        .on('end', async () => {
            console.log(`CSV file processed. Found ${contactsToAdd.length} numbers to process.`);

            if (contactsToAdd.length > 0) {
                console.log('Processing contacts...');
                let processedCount = 0;
                
                // Create a summary file
                const summaryData = [];

                for (let i = 0; i < contactsToAdd.length; i++) {
                    const contact = contactsToAdd[i];
                    const contactId = `${contact.phoneNumber}@c.us`;
                    
                    try {
                        console.log(`\n[${i + 1}/${contactsToAdd.length}] Processing: ${contact.name} (${contact.phoneNumber})`);
                        
                        // Method 1: Try to get contact info
                        let contactInfo = null;
                        try {
                            contactInfo = await client.getContactById(contactId);
                            console.log(`  - Contact ID: ${contactInfo.id.user}`);
                            console.log(`  - Is WhatsApp User: ${contactInfo.isWAContact}`);
                            console.log(`  - Current Name: ${contactInfo.name || contactInfo.pushname || 'No name'}`);
                            
                            // Store contact information
                            summaryData.push({
                                index: contact.originalIndex,
                                assignedName: contact.name,
                                phoneNumber: contact.phoneNumber,
                                whatsappUser: contactInfo.isWAContact,
                                currentName: contactInfo.name || contactInfo.pushname || 'No name',
                                profilePic: contactInfo.profilePicUrl || 'No profile pic',
                                status: 'Found'
                            });
                            
                        } catch (error) {
                            console.log(`  - Contact not found or error: ${error.message}`);
                            summaryData.push({
                                index: contact.originalIndex,
                                assignedName: contact.name,
                                phoneNumber: contact.phoneNumber,
                                whatsappUser: false,
                                currentName: 'Not found',
                                profilePic: 'N/A',
                                status: 'Not found'
                            });
                        }
                        
                        processedCount++;
                        
                        // Add delay
                        if (i < contactsToAdd.length - 1) {
                            await sleep(DELAY_BETWEEN_CONTACTS_S * 1000);
                        }
                        
                    } catch (error) {
                        console.log(`  - ERROR: ${error.message}`);
                        summaryData.push({
                            index: contact.originalIndex,
                            assignedName: contact.name,
                            phoneNumber: contact.phoneNumber,
                            whatsappUser: false,
                            currentName: 'Error',
                            profilePic: 'N/A',
                            status: 'Error'
                        });
                    }
                }

                // Save summary to file
                const summaryContent = summaryData.map(item => 
                    `${item.assignedName},${item.phoneNumber},${item.whatsappUser},${item.currentName},${item.status}`
                ).join('\n');
                
                const header = 'AssignedName,PhoneNumber,IsWhatsAppUser,CurrentName,Status\n';
                fs.writeFileSync('contacts_summary.csv', header + summaryContent);

                console.log('\n--- SUMMARY ---');
                console.log(`Total contacts processed: ${processedCount}`);
                console.log(`WhatsApp users found: ${summaryData.filter(c => c.whatsappUser).length}`);
                console.log(`Non-WhatsApp numbers: ${summaryData.filter(c => !c.whatsappUser && c.status !== 'Error').length}`);
                console.log(`Errors: ${summaryData.filter(c => c.status === 'Error').length}`);
                console.log('\nSummary saved to: contacts_summary.csv');
                
                console.log('\nContact mapping:');
                summaryData.forEach(contact => {
                    console.log(`${contact.assignedName} -> ${contact.phoneNumber} (${contact.currentName}) [${contact.status}]`);
                });
                
            } else {
                console.log("No valid numbers found in the CSV file.");
            }

            console.log('\nAll operations complete. Closing client.');
            await client.destroy();
        });
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE:', msg);
});

client.initialize();
