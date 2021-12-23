import parseApache from 'parse-apache-directory-index';
import fetch from 'node-fetch';
import fs from 'fs';
import jszip from 'jszip'

const URL = 'http://magneto.igf.edu.pl/srr/';

const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
};

var lastZipName = 0;

main ();

async function main (){
    await getLastFiles('./zips/', './unzipped/');
    while(true){
        try{
            let fileList = await get_filelist();
            fileList = onlyLastOnList(fileList.files);
            if(fileList !== -1) await download_files(fileList);
            await asyncSleep(1000);
        } catch (error){
            console.log('Error: ', error);
            await asyncSleep(5000);
        }
    }
}
    
const asyncSleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

//http://magneto.igf.edu.pl/srr/20211218111114.zip
async function get_filelist () {
    let status;
    let response = await fetch(URL, {
            headers: headers,
        })
        .then((res) => { 
            status = res.status; 
            return res.text();
        }).catch(e=>console.log(e));


    if (status != 200) {
        console.log('Unable to get files. Code: ' + status);
        return -1;
    }

    return parseApache(response);
}

function onlyLastOnList (list) {
    let newList = [];
    newList.push(list[list.length-1]);
    return newList;
}

async function download_files (list) {
    for (let i = 0; i < list.length; i++){
        let name = list[i].name;
        if(parseInt(name) > lastZipName){
            await downloadFile(URL, './zips/', name)
            await unzipFile ('./zips/', './unzipped/', name);
            await removeZipFile('./zips/', name);
        }
    }
}

async function downloadFile (url, path, name) {
    console.log('Downloading ', url + name);
    const res = await fetch(url + name);
    const fileStream = fs.createWriteStream(path + name);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
      });
    lastZipName = parseInt(name);
};

async function unzipFile (zipPath, unzipPath, name) {
    console.log('Unzipping ', name);
    fs.readFile(zipPath + name, function(err, data) {
        if (err) console.log('Error (unzipping):', err);
        jszip.loadAsync(data).then(function (zip) {
           let filenameInZip = name.replace('.zip', '');
           var dest = unzipPath + 'magneto_belsk.txt';
            Object.keys(zip.files).forEach(function(filename) {
                zip.file(filename).async('nodebuffer').then(function(content) {
                    fs.writeFileSync(dest, content);
                });
            });
        });
    });
};

async function removeZipFile (zipPath, name) {
    console.log('Removing zip ', name);
    await fs.unlinkSync(zipPath + name);
};

async function getLastFiles (zipPath, unzipPath) {
    let lastUnzippedNameLocal = 0;
    fs.readdirSync(unzipPath).forEach(file => {
        if(parseInt(file) > lastUnzippedNameLocal) lastUnzippedNameLocal = parseInt(file);
    });
    lastZipName = lastUnzippedNameLocal;
    console.log('Last unzipped file: ', lastZipName)
};