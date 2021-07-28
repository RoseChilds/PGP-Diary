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
                console.log(`  ${i}: ${ext.parsetime(entry.time)}`.magenta)
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
            let tolog = `| Entry ${ext.parsetime(entries[toload].time)} |`;
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
            console.log("Saving to diary..".yellow);
            diary.entries.push({
                time: date.getTime(),
                content: lines.join('\n')
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
            console.log(`  ${i}: ${ext.parsetime(entry.time)}`.magenta)
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
    }
}