const os = require('os');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const readline = require('readline');
const asar = require('@electron/asar');

const REG_KEY_TYPORA_PATH = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Typora.exe';


function print_good(msg) {
    console.log(`[+] ${msg}`);
}

function print_bad(msg) {
    console.log(`[-] ${msg}`);
}

function print_info(msg) {
    console.log(`[*] ${msg}`);
}


function showBanner() {
    let banner = `
    _/                                                  _/      
    _/          _/_/      _/_/_/  _/    _/    _/_/_/  _/_/_/_/   
   _/        _/    _/  _/    _/  _/    _/  _/    _/    _/        
  _/        _/    _/  _/    _/  _/    _/  _/    _/    _/         
 _/_/_/_/    _/_/      _/_/_/    _/_/_/    _/_/_/      _/_/      
                          _/                                    

Loquat - A Typora Patch Tool\n`;

    console.log(banner);
}

function genFakeLicense() {
    const LICENSE_CHARS = 'L23456789ABCDEFGHJKMNPQRSTUVWXYZ'.split('');
    const LICENSE_CHARS_LEN = LICENSE_CHARS.length;
    let license =  getRandomArr(LICENSE_CHARS, 22);
    
    let odd = 0, even = 0;
    for (let i = 0; i < 16; i++) {
        let index = LICENSE_CHARS.indexOf(license[i]);
        if (i % 2) {
            odd += index;
        } else {
            even += index;
        }
    }
    
    license.push(LICENSE_CHARS[even % LICENSE_CHARS_LEN]);
    license.push(LICENSE_CHARS[odd % LICENSE_CHARS_LEN]);
    return license.join('').replace(/(\w{6})(?!$)/g, '$1-');
}


function getRandomArr(arr, count) {
    let ret = [];
    while (count-- > 0) {
        ret.push(arr[Math.floor(Math.random() * arr.length)]);
    }

    return ret;
}


function queryReg(key) {
    try {
        return child_process.execSync(`REG QUERY "${key}"`).toString();
    } catch {
        return null;
    }
}

function getTyporaRoot() {
    let regRet = queryReg(REG_KEY_TYPORA_PATH);
    if (regRet) {
        return regRet.split('\r\n')[2].replace(/(^.*REG_SZ\s+)(.*)(Typora\.exe$)/, '$2');
    }
}


function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'loquat-'));
}

async function patch() {
    let typoraRoot = getTyporaRoot();
    if (typoraRoot) {
        print_info(`The Typora root path is "${typoraRoot}"`);
    } else {
        print_bad('Failed to get Typora root path');
    }

    let tempDir = makeTempDir();
    print_info(`Temp directory is "${tempDir}"`);

    print_info('Try extract node_modules.asar to temp directory');
    let asar_path = path.join(typoraRoot, 'resources', 'node_modules.asar');
    if (fs.existsSync(asar_path)) {
        await asar.extractAll(asar_path, tempDir);
    }

    let raven_path = path.join(tempDir, 'raven');
    print_info(`Try to copy hook.js to ${raven_path}`);
    fs.copyFileSync('hook.js', path.join(raven_path, 'hook.js'));
    
    print_info('Try to patch raven module');
    fs.appendFileSync(path.join(raven_path, 'index.js'), '\nrequire("./hook");\n');

    print_info('Try to backup original node_modules.asar to node_modules.asar.bak');
    fs.renameSync(asar_path, asar_path + '.bak');

    print_info('Try to pack modified node_modules');
    await asar.createPackage(tempDir, asar_path);

    print_good('Congratulation! Patch Typora successed, enjoy!');
}

const rdi = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function cmdLoop() {
    rdi.question('> ', async (cmd) => {
        switch(cmd) {
            case '1':
                print_good(`License is ${genFakeLicense()}`);
                break;

            case '2':
                await patch();
                break;
            
            case '9':
                print_info('Bye! :)');
                process.exit(0);

            default:
                print_bad('Illegal command');
        }

        cmdLoop();
    });
}


function main() {
    showBanner();
    print_info('Usage:\n\t1 => Generate license\n\t2 => Patch typora\n\t9 => Exit');
    cmdLoop();   
}

main();