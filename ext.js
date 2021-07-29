var readline = require('readline');
var Writable = require('stream').Writable;
const fs = require('fs').promises;
const openpgp = require('openpgp');
const nth = function (d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}
const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getanswer(question, conf = false, password = false) {
    var mutableStdout = new Writable({
        write: function (chunk, encoding, callback) {
            if (!this.muted)
                process.stdout.write(chunk, encoding);
            callback();
        }
    });
    var start = new Date().getTime();
    mutableStdout.muted = false;
    return new Promise((resolve, reject) => {
        var config = {
            input: process.stdin,
            output: mutableStdout,
            terminal: true
        };
        const confidential = readline.createInterface(config);
        confidential.question(question, async function (result) {
            confidential.close();
            var end = new Date().getTime();
            if ((end - start) > (60 * 3 * 1000) && !password) {
                if (conf) {
                    console.log("");
                }
                var checkpassword = await getanswer("You've been idle for more than 3 minutes. For your security please retype your password > ".red.bold, true, true);
                console.log("");
                console.log("Checking password..".yellow);
                const configfile = await fs.readFile('diaryconfig', 'utf8');
                var config = JSON.parse(configfile);
                const passencrypted = config.private;
                try {
                    const {data: passdecrypt, signatures} = await openpgp.decrypt({
                        message: await openpgp.readMessage({armoredMessage: passencrypted}),
                        passwords: [checkpassword],
                    });
                    console.log("Thanks for confirming your password".green);
                } catch (e) {
                    console.log("Incorrect password. Exiting diary.".red);
                    await getanswer("Press [ENTER] to continue..".gray, true, true);
                    process.exit(0);
                }
            }
            return resolve(result);
        });
        if (conf) {
            mutableStdout.muted = true;
            if (password) {
                mutableStdout.password = true;
            }
        }
    });
}

module.exports = {
    getanswer,
    parsetime: (time) => {
        var date = new Date(time);
        return `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}, ${('0' + date.getDate()).slice(-2)}${nth(date.getDate())} ${month[date.getMonth() - 1]} ${date.getFullYear()}`;
    }

}