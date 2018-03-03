const program = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const request = require('request');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const questions = [
    {
        type: 'input',
        name: 'packName',
        message: 'Please enter pack name'
    },
    {
        type: 'input',
        name: 'packVersion',
        message: 'Please enter pack version (e.g 1.0.0)',
        default: function () {
            return "1.0.0"
        },
        validate: function (value) {
            let pass = value.match(/(\d+)\.(\d+)\.(\d+)/i);
            if (pass) {
                return true;
            }
            return "Please enter valid version (e.g. 1.0.0)"
        }
    },
    {
        type: 'input',
        name: 'packAuthor',
        message: 'Please enter pack author'
    },
    {
        type: 'input',
        name: 'mcVersion',
        message: 'Minecraft version (e.g 1.12.2)',
        default: function () {
            return "1.12.2"
        },
        validate: function (value) {
            let pass = value.match(/(\d+)\.(\d+)\.(\d+)/i);
            if (pass) {
                return true;
            }
            return "Please enter valid version (e.g. 1.12.2)"
        }
    },
    {
        type: 'input',
        name: 'forgeVersion',
        message: 'Forge Version (e.g 14.23.2.2624)',
        default: function () {
            return "14.23.2.2624"
        },
        validate: function (value) {
            let pass = value.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/i);
            if (pass) {
                return true;
            }
            return "Please enter valid version (e.g. 14.23.2.2624)"
        }
    }
];

let packName;
let packVersion;
let packAuthor;
let mcVersion;
let forgeVersion;
let projectObj = [];
let modList = [];
let curseJson;

if (!fs.existsSync('meta')) {
    fs.mkdirSync('meta')
}

checkMeta();

function checkMeta() {

    if (fs.existsSync('./meta/curse.json')) {
        fs.createReadStream('./meta/curse.json').pipe(crypto.createHash('md5').setEncoding('hex')).on('finish', function () {
            let jsonHash = this.read();
            request('https://fdn.redstone.tech/theoneclient/hl3/onemeta/curse.json.md5')
                .pipe(fs.createWriteStream('./meta/curse.json.md5'))
                .on('close', function () {
                    fs.readFile('./meta/curse.json.md5', 'utf8', function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        if (data.split('\n')[0] !== jsonHash) {
                            request('https://fdn.redstone.tech/theoneclient/hl3/onemeta/curse.zip')
                                .pipe(fs.createWriteStream('./meta/curse.zip'))
                                .on('close', function () {
                                    console.log('File written!');
                                    let zip = new AdmZip("./meta/curse.zip");
                                    zip.extractAllTo("./meta/", true);
                                    run();
                                });
                        } else {
                            run();
                        }
                    });
                });
        })
    } else {
        request('https://fdn.redstone.tech/theoneclient/hl3/onemeta/curse.zip')
            .pipe(fs.createWriteStream('./meta/curse.zip'))
            .on('close', function () {
                console.log('File written!');
                let zip = new AdmZip("./meta/curse.zip");
                zip.extractAllTo("./meta/", true);
                run();
            });
    }
}

function list(val) {
    return val.split(',')
}

function run() {
    curseJson = JSON.parse(fs.readFileSync('./meta/curse.json', 'utf8'));
    program
        .version('1.0.0', '-v, --version')
        .usage('[options] <filepath>')
        .option('-d, --dir <path>', 'Path to root folder of Minecraft instance')
        .option('-i, --include <directory/file names>', list)
        .parse(process.argv);

    if (program.dir) {
        inquirer.prompt(questions).then(answers => {
            packName = answers.packName;
            packVersion = answers.packVersion;
            packAuthor = answers.packAuthor;
            mcVersion = answers.mcVersion;
            forgeVersion = answers.forgeVersion;
            readDirectory(program.dir)
        });
    } else {
        console.error("No file path specified use -h for help")
    }
}


function readDirectory(dirPath) {
    fs.readdir(dirPath, (err, files) => {
        files.forEach(file => {
            if (file === 'mods') {
                listMods(path.join(dirPath, file))
            }
        });
    });
}

function listMods(modsFolder) {
    let mods = 0;
    fs.readdir(modsFolder, (err, files) => {
        files.forEach(file => {
            if (path.extname(file) === '.jar') {
                mods++;
                modList.push(file);
                if (mods === files.length) {
                    getProjectID()
                }
            }
        });
    });
}

function getProjectID() {

    modList.forEach(mod => {
        Object.entries(curseJson['files']).forEach(project => {
            if (project[1]['filename'] === mod) {
                projectObj.push({projectID: project[1]['project'], fileID: project[1]['id'], required: true})
            }
        })
    })
    createExport();

    // let projectIds = Object.keys(curseJson[0]);
    // console.log(Object.entries(curseJson[0]))

    // projectIds.forEach((id) => {
    //     console.log(id, curseJson[0][id].Name)
    // })

    // for (let i = 0; i < projectIds.length; i++){
    //     console.log(curseJson.projectIds[i])
    // }
    // console.log(curseJson.length)
    // for (let i = 0; i < curseJson.length; i++) {
    //     for(let x = 0; x < Object.keys(curseJson[i]); x++){
    //         console.log(Object.keys(curseJson[i])[x])
    //     }
    //     // look for the entry with a matching `code` value
    //     // for (let x = 0; x < curseJson[i]['GameVersionLatestFiles'].length; x++) {
    //     //     modList.forEach(mod => {
    //     //         // if (curseJson[i]['GameVersionLatestFiles'][x].ProjectFileName === mod) {
    //     //         //     console.log(curseJson[i].Id, curseJson[i]['GameVersionLatestFiles'][x].ProjectFileName, mod,)
    //     //         // }
    //     //     });
    //     //     // if (curseJson['Data'][i].code == needle){
    //     //     //     // we found it
    //     //     //     // obj[i].name is the matched result
    //     //     // }
    //     // }
    // }
}

function createExport() {
    if (!fs.existsSync('export')) {
        fs.mkdirSync('export')
    }

    let manifest = {
        minecraft: {
            version: mcVersion,
            modLoaders: [
                {
                    id: 'forge-' + mcVersion + '-' + forgeVersion,
                    primary: true
                }
            ],
        },
        manifestType: "minecraftModpack",
        manifestVersion: 1,
        name: packName,
        version: packVersion,
        author: packAuthor,
        files: projectObj,
        overrides: "overrides"
    };
    fs.writeFile("./export/manifest.json", JSON.stringify(manifest), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}
