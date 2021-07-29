var readline = require('readline');
var Writable = require('stream').Writable;
const openpgp = require('openpgp');
const color = require('colors');
const fs = require('fs').promises;
const ext = require('./ext');
const functions = require('./functions');
const getanswer = ext.getanswer;

async function main(){
    console.log("© Rose Childs 2021".rainbow);
    var configexists = true;
    try{
        await fs.access('diaryconfig');
    }catch(e){
        configexists=false;
    }
    if(!configexists){
        console.log("Config not found, generating now..".yellow);
        let newpass = await getanswer("Password you want to use > ".blue, true, true);
        console.log("");
        console.log("Generating keys..".yellow);
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'rsa',
            rsaBits: 4096,
            userIDs: [{ name: 'PGP Diary', email: 'email@example.com' }],
            passphrase: newpass
        });
        console.log("Encrypting private key..".yellow);
        const encryptedPrivate = await openpgp.encrypt({
            message: await openpgp.createMessage({text: privateKey}),
            passwords: [newpass]
        });
        var config = {
            public: publicKey,
            private: encryptedPrivate
        };
        console.log("Writing to config..".yellow);
        await fs.writeFile('diaryconfig', JSON.stringify(config));
        console.log("Config saved".green);
    }
    console.log("Loading config..".yellow);
    const configfile = await fs.readFile('diaryconfig', 'utf8');
    var config = JSON.parse(configfile);
    console.log("Config loaded".green);
    var pass = await getanswer("Diary password > ".blue, true, true);
    var keypass = pass;
    console.log("");
    console.log("");
    console.log("Logging in..".yellow);
    const passencrypted = config.private;

    try{
        const { data: passdecrypt, signatures } = await openpgp.decrypt({
            message: await openpgp.readMessage({armoredMessage: passencrypted}),
            passwords: [pass],
        });
        const privateKeyloaded = await openpgp.readKey( {
            armoredKey: passdecrypt
        });
        var privateKey = await openpgp.decryptKey({
            privateKey: privateKeyloaded,
            passphrase: keypass
        });
    }catch(e){
        console.error("Incorrect password".red);
        await getanswer("Press [ENTER] to continue..".gray, true);
        return process.exit(0);
    }

    console.log("Logged in successfully".green)

    const publicKey = await openpgp.readKey({ armoredKey:config.public});
    config.publicKey = publicKey;
    config.privateKey = privateKey;
    config.password = pass;
    var exists = true;
    try{
        await fs.access('diary');
    }catch(e){
        exists=false;
    }
    if(!exists){
        console.log("Diary doesn't exist, creating..".yellow);
        const diary = {
            entries: [{
                time: new Date().getTime(),
                content: `Hey! Thanks for using PGP-Diary! I hope you enjoy using my little project.\nWanna see more from me? Check out my GitHub at https://github.com/RoseChilds, or add me on Discord at rosee#0001!`,
                title: `Message from Rose`
            }]
        };
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: JSON.stringify(diary) }),
            encryptionKeys: publicKey,
            signingKeys: privateKey // optional
        });
        await fs.writeFile('diary', encrypted);
        console.log("Created diary file".green);
    };
    console.log("Loading diary file..".yellow);
    const diaryfile = await fs.readFile('diary', 'utf8');
    console.log("Decrypting diary..".yellow);
    try{
        var { data: decrypted, signatures } = await openpgp.decrypt({
            message: await openpgp.readMessage({armoredMessage: diaryfile }),
            verificationKeys: publicKey,
            decryptionKeys: privateKey
        });
    }catch(e){
        console.error("ERROR: Diary decryption failed!".red);
        await getanswer("Press [ENTER] to continue..".gray, true);
        process.exit(0);
    }

    const diary = JSON.parse(decrypted);
    console.log("Diary loaded".green);
    console.log("");
    while(true){
        console.log("Modes".magenta);
        console.log(`  [R]ead (${diary.entries.length.toLocaleString()} entr${diary.entries.length==1 ? 'y' : 'ies'})`.magenta);
        console.log("  [W]rite".magenta);
        console.log("  [D]elete".magenta);
        console.log("  [C]hange password".magenta);
        console.log("  [E]xit".magenta);
        while (true) {
            var option = await getanswer("Choose mode > ".blue);
            var skip = false;
            switch (option.toLowerCase()) {
                case "r":
                case "w":
                case "d":
                case "c":
                    skip = true;
                    break;
                case "e":
                    await getanswer("Press [ENTER] to continue..".gray, true, true);
                    process.exit(0);
                    break;
                default:
                    console.log("Invalid option".red);
                    break;
            }
            if (skip) {
                option = option.toLowerCase();
                break;
            }
        }
        console.log("");
        if (option == "w") {
            await functions.write(diary, config);
        }else if(option == "r"){
            await functions.read(diary, config);
        }else if(option == "d"){
            await functions.delete(diary, config);
        }else if(option == "c"){
            var newconfig = await functions.changepassword(diary, config);
            if(newconfig){
                config = newconfig;
            }

        }
        console.log("");
        await getanswer("Press [ENTER] to continue..".gray, true);
        console.clear();
    }
}
main();
