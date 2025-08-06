const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

// --- Configuration ---
const CSV_FILE_PATH = 'contacts_summary.csv'; // Using processed summary file
const COUNTRY_CODE = '91';

// --- Safety Delay (IMPORTANT!) ---
// Delay in seconds between adding contacts to avoid getting banned
const DELAY_BETWEEN_CONTACTS_S = 2;
// --------------------

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Users\\SIBIJ\\AppData\\Local\\ms-playwright\\chromium-1179\\chrome-win\\chrome.exe',
        headless: false, // Set to true for background execution
        args: ['--no-sandbox'],
    }
});

// Helper function for creating a delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.on('qr', (qr) => {
    console.log('QR Code Received! Please scan it with your phone.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');
    
    // Read processed contacts from summary CSV
    const contactsToAdd = [];
    
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
            // Only process WhatsApp users that were found in the analysis
            if (row.IsWhatsAppUser === 'true' && row.Status === 'Found' && row.PhoneNumber) {
                const phoneNumber = row.PhoneNumber.trim();
                const assignedName = row.AssignedName.trim();
                const currentName = row.CurrentName.trim();
                
                contactsToAdd.push({
                    phoneNumber: phoneNumber,
                    assignedName: assignedName,
                    currentName: currentName,
                    whatsappId: `${phoneNumber}@c.us`
                });
            }
        })
        .on('end', async () => {
            console.log(`CSV file processed. Found ${contactsToAdd.length} WhatsApp users to process.`);

            if (contactsToAdd.length > 0) {
                console.log('Starting to process contacts...');
                console.log('Note: Only processing verified WhatsApp users from the analysis.');
                let successCount = 0;
                let failCount = 0;

                for (let i = 0; i < contactsToAdd.length; i++) {
                    const contact = contactsToAdd[i];
                    
                    try {
                        console.log(`\n[${i + 1}/${contactsToAdd.length}] Processing contact:`);
                        console.log(`  Assigned Name: ${contact.assignedName}`);
                        console.log(`  Current Name: ${contact.currentName}`);
                        console.log(`  Phone: ${contact.phoneNumber}`);
                        
                        // Check if contact already exists
                        try {
                            const existingContact = await client.getContactById(contact.whatsappId);
                            if (existingContact && existingContact.name && existingContact.name !== existingContact.number) {
                                console.log(`  - Contact already accessible with name: ${existingContact.name}`);
                                console.log(`  - Current status: Already available in WhatsApp`);
                                successCount++;
                                continue;
                            }
                        } catch (e) {
                            // Contact doesn't exist in local contacts, proceed with message
                        }

                        // Send a message to create the chat and make the contact accessible
                        try {
                            const message = `Hello ${contact.currentName}! This is an automated message to add you as "${contact.assignedName}" for our university project group. You can ignore this message. Thank you!`;
                            
                            await client.sendMessage(contact.whatsappId, message);
                            await client.saveOrEditAddressbookContact({
                                phoneNumber: contact.phoneNumber,
                                firstName: contact.assignedName,
                                lastName: contact.currentName,
                                syncToAddressbook: false
                            });
                            console.log(`  - SUCCESS: Chat created and contact saved as ${contact.assignedName}`);
                            console.log(`  - Message sent to establish contact`);
                            successCount++;
                            
                            // Add delay between contacts
                            if (i < contactsToAdd.length - 1) {
                                console.log(`  - Waiting ${DELAY_BETWEEN_CONTACTS_S} seconds before next contact...`);
                                await sleep(DELAY_BETWEEN_CONTACTS_S * 1000);
                            }
                            
                        } catch (msgError) {
                            console.log(`  - FAILED: Could not create chat for ${contact.assignedName}`);
                            console.log(`  - Error: ${msgError.message}`);
                            failCount++;
                        }
                        
                    } catch (error) {
                        console.log(`  - ERROR processing ${contact.assignedName}: ${error.message}`);
                        failCount++;
                    }
                }

                console.log('\n--- SUMMARY ---');
                console.log(`Total WhatsApp contacts processed: ${contactsToAdd.length}`);
                console.log(`Successfully processed: ${successCount}`);
                console.log(`Failed: ${failCount}`);
                console.log('\nProcessed contacts with their assigned names:');
                contactsToAdd.forEach(contact => {
                    console.log(`  ${contact.assignedName} -> ${contact.currentName} (${contact.phoneNumber})`);
                });
                console.log('\nNOTE: WhatsApp Web API limitations:');
                console.log('- Contacts are not directly added to your phone\'s contact list');
                console.log('- Instead, chats are created which makes the numbers accessible');
                console.log('- You may need to manually save important contacts to your phone');
                
            } else {
                console.log("No valid WhatsApp users found in the summary file.");
                console.log("Make sure you ran 'node analyze_contacts_from_csv.js' first to generate contacts_summary.csv");
            }

            console.log('\nAll operations complete. Closing client.');
            await client.destroy();
        });
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

client.initialize();
