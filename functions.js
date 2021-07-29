const ext = require('./ext');
const getanswer = ext.getanswer;
const openpgp = require('openpgp');
const color = require('colors');
const fs = require('fs').promises;

module.exports = {
    read: async (diary, config) => {
        var entries = {};
        var i = 0;
        if(Object.keys(diary.entries).length<=0){
            console.log("There are no diary entries".red);
        }else{
            console.log("Entries".magenta);
            for(const entry of diary.entries){
                i++;
                entries[i.toString()]=entry;
                console.log(`  ${i}: ${ext.parsetime(entry.time)}${entry.title ? ` - ${entry.title}` : ''}`.magenta)
            }
            while(true){
                var toload = await getanswer("Choose entry to load > ".blue);
                if(!(toload in entries)){
                    console.log("That's not a valid entry".red);
                    continue;
                }
                break;
            }
            console.log("");
            let tolog = `| Entry ${ext.parsetime(entries[toload].time)}${entries[toload].title ? ` - ${entries[toload].title}` : ''} |`;
            console.log("-".repeat(tolog.length).cyan);
            console.log(tolog.cyan);
            console.log("-".repeat(tolog.length).cyan);
            console.log(`${entries[toload].content}`.cyan);
        }
    },
    write: async (diary, config) => {
        var date = new Date();
        console.log(`New diary entry for ${ext.parsetime(date.getTime())}`.magenta);
        console.log(`Write "--save--" to stop writing and save`.magenta);
        console.log(`Write "--exit--" to stop writing without saving`.magenta);
        console.log(`Write "--delete--" to delete the last line`.magenta);
        console.log("");
        var lines = [];
        while (true) {
            var line = await getanswer("");
            if (line == "--save--") {
                break;
            }
            if(line == "--exit--"){
                lines = [];
                break;
            }
            if(line == "--delete--"){
                lines.pop();
                console.log("Deleted last line".magenta);
                continue;
            }
            lines.push(line);
        }
        if(lines.length>0){
            console.log("");
            var title = await getanswer("Title (optional) > ".blue);
            if(title==""){
                title=undefined;
            }
            console.log("Saving to diary..".yellow);
            diary.entries.push({
                time: date.getTime(),
                content: lines.join('\n'),
                title
            });
            console.log("Encrypting diary..".yellow);
            const encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({text: JSON.stringify(diary)}),
                encryptionKeys: config.publicKey,
                signingKeys: config.privateKey
            });
            console.log("Writing to file..".yellow);
            await fs.writeFile('diary', encrypted);
            console.log("Diary entry saved".green);
        }
    },
    delete: async (diary, config) => {
        var entries = {};
        var i = 0;
        console.log("Entries".magenta);
        for(const entry of diary.entries){
            i++;
            entries[i.toString()]=entry;
            console.log(`  ${i}: ${ext.parsetime(entry.time)}${entry.title ? ` - ${entry.title}` : ''}`.magenta)
        }
        while(true){
            var toload = await getanswer("Choose entry to delete > ".blue);
            if(!(toload in entries)){
                console.log("That's not a valid entry".red);
                continue;
            }
            break;
        }
        console.log("Deleting file..".yellow);
        diary.entries.splice(parseInt(toload)-1, 1);
        console.log("Encrypting diary..".yellow);
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({text: JSON.stringify(diary)}),
            encryptionKeys: config.publicKey,
            signingKeys: config.privateKey
        });
        console.log("Writing to file..".yellow);
        await fs.writeFile('diary', encrypted);
        console.log("Diary entry deleted".green);
    },
    changepassword: async (diary, config) => {
        var current = await getanswer("Current password > ".blue, true, true);
        if(current!=config.password){
            console.error("Incorrect password".red);
            return;
        }
        console.log("");
        var newpassword = await getanswer("New password > ".blue, true, true);
        console.log("");
        var passwordcheck = await getanswer("Confirm password > ".blue, true, true);
        console.log("");
        if(newpassword!=passwordcheck){
            console.error("Passwords don't match".red);
            return;
        }
        console.log("Generating new key pair..".yellow);
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'rsa',
            rsaBits: 4096,
            userIDs: [{ name: 'PGP Diary', email: 'email@example.com' }],
            passphrase: newpassword
        });
        config.privateKey = await openpgp.decryptKey({
            privateKey: await openpgp.readKey( {armoredKey: privateKey}),
            passphrase: newpassword
        });
        config.publicKey = await openpgp.readKey({ armoredKey:publicKey});
        config.password = newpassword;
        config.public = publicKey;
        console.log("Encrypting diary..".yellow);
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({text: JSON.stringify(diary)}),
            encryptionKeys: config.publicKey,
            signingKeys: config.privateKey
        });
        console.log("Saving diary..".yellow);
        await fs.writeFile('diary', encrypted);
        console.log("Saved diary".green);
        console.log("Encrypting private key..".yellow);
        const encryptedPrivate = await openpgp.encrypt({
            message: await openpgp.createMessage({text: privateKey}),
            passwords: [newpassword]
        });
        config.private = encryptedPrivate;
        console.log("Saving config..".yellow);
        var newconfig = {
            public: config.public,
            private: encryptedPrivate
        };
        await fs.writeFile('diaryconfig', JSON.stringify(newconfig));
        console.log("Saved config".green);
        console.log("Password changed successfully".green);
        return config
    }
}