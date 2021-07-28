# PGP-Diary
A diary that's protected by PGP.

## How does it work?
When you first launch the program, you'll be asked to create a password. PGP-Diary then generates a public and private key pair, and locks the private key with your password. The public key is then stored in the config, and your private key is encrypted and stored alongside it. Whenever you log into PGP-Diary, you'll be asked to give the password that you provided at the start so your private key can be decrypted, and your diary can be decrypted.

## Installing
Either [download the latest release](https://github.com/RoseChilds/PGP-Diary/releases/latest), or run from the source code.

## Running from source
```
git clone https://github.com/RoseChilds/PGP-Diary
cd PGP-Diary
npm i
node index.js
```
