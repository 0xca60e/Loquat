const MAGIC_STRING = 'CRACKED_TYPORA';
let License = '';

const crypto = require('crypto');
const pubdec = crypto['publicDecrypt'];
crypto.publicDecrypt = function(key, buffer) {
    if (buffer.slice(0, MAGIC_STRING.length).compare(Buffer.from(MAGIC_STRING)) == 0) {
        License = buffer.toString('base64');
        let ret = buffer.toString().replace(MAGIC_STRING, '');
        return Buffer.from(ret);
    } else {
        return pubdec(key, buffer);
    }
}

const fetch = require('electron-fetch');
let originalFetch = fetch['default'];
fetch.default = async function fetch(url, options) {
    let data = await originalFetch(url, options);
    if (url.indexOf('api/client/activate') != -1) {
        let params = JSON.parse(options.body);
        let { f: fingerprint, email, license } = params;
        let msg = Buffer.from(MAGIC_STRING + JSON.stringify({
            fingerprint,
            email,
            license,
            type: ''
        })).toString('base64');

        let ret = Buffer.from(JSON.stringify({
            code: 0,
            retry: true,
            msg
        })).toString();

        data.text = () => {
            return new Promise((resolve, reject) => {
                resolve(ret);
            });
        }

        data.json = () => {
            return new Promise((resolve, reject) => {
                resolve(JSON.parse(ret));
            });
        }
    } else if (url.indexOf('api/client/renew') != -1) {
        let ret = Buffer.from(JSON.stringify({
            success: true,
            code: 0,
            retry: true,
            msg: License
        })).toString();

        data.text = () => {
            return new Promise((resolve, reject) => {
                resolve(ret);
            });
        }

        data.json = () => {
            return new Promise((resolve, reject) => {
                resolve(JSON.parse(ret));
            });
        }
    }  
    
    return new Promise((resovle, reject) => {
        resovle(data);
    });
}


let Module = require('module');
let originalRequire = Module.prototype.require;
Module.prototype.require = function() {
    let arg0 = arguments[0];
    if (arg0 == 'crypto') {
        return crypto;
    } else if (arg0 == 'electron-fetch') {
        return fetch;
    } else {
        return originalRequire.apply(this, arguments);
    }
}

module.exports = fetch