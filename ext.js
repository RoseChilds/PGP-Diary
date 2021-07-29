var readline = require('readline');
var Writable = require('stream').Writable;
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
module.exports = {
    getanswer: function (question, conf = false, password = false) {
        var mutableStdout = new Writable({
            write: function (chunk, encoding, callback) {
                if (!this.muted)
                    process.stdout.write(chunk, encoding);
                callback();
            }
        });
        mutableStdout.muted = false;
        return new Promise((resolve, reject) => {
            var config = {
                input: process.stdin,
                output: mutableStdout,
                terminal: true
            };
            const confidential = readline.createInterface(config);
            confidential.question(question, function (result) {
                confidential.close();
                return resolve(result);
            });
            if (conf) {
                mutableStdout.muted = true;
                if (password) {
                    mutableStdout.password = true;
                }
            }
        });
    },
    parsetime: (time) => {
        var date = new Date(time);
        return `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}, ${('0' + date.getDate()).slice(-2)}${nth(date.getDate())} ${month[date.getMonth() - 1]} ${date.getFullYear()}`;
    }

}