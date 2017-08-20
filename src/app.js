let sqlite = require('sqlite');
let exec = require('exec');
var PImage = require('pureimage');
var wordnet = require('wordnet');
let fs = require('fs');
var pdf2img = require('pdf2img');
let PDFDocument = require('pdfkit');
var path = require('path');

let allWords = [];
// TO DO
// create PDF
// https://www.npmjs.com/package/pdfkit
// PDF to image
// https://www.npmjs.com/package/pdf-image
// scale image to my phone
// copy image to dropbox folder.

/**
 * Future:
 * Web app for other people.
 * You can access USB devices.
 * 
 * Then its just a case of the app on the phone...
 * 
 */
// convert -verbose -density 150 trim definitions.pdf -quality 100 -flatten -sharpen 0x1.0 test.jpg

// convert -density 150 trim definitions.pdf -quality 100 -flatten -sharpen 0x1.0 test.jpg

//USE THIS ONE:: convert -monitor -density 300 definitions.pdf -quality 100 test.jpg

function convertWordsIntoPages(){
    return ()=>{
        return new Promise((resolve,reject)=>{
            let doc = new PDFDocument;
            doc.pipe(fs.createWriteStream('definitions.pdf'));
            allWords.forEach((wordObject)=>{
                if((wordObject)&&(wordObject.length>0)){
                    doc.addPage();
                    doc.font('SourceSansPro-Regular.ttf')
                    .fontSize(40)
                    .text(wordObject[0].word, 100, 100);
                    wordObject[0].definitions.forEach((definition)=>{
                    let examples = definition.split(';');
                    examples.forEach((example)=>{
                        //first example is title
                        doc.fontSize(30).text(example.trim() + '\n');
                    });
                });
                }
                console.log('word adding');
            });
            console.log('here');
            doc.end();
            resolve();
        });
    }
}
function turnPDFintoImage(){
    return ()=>{
        return new Promise((resolve,reject)=>{
            exec('convert -monitor -density 300 definitions.pdf -quality 100 test.jpg', function(err, out, code) {
                if (err instanceof Error){
                    process.stderr.write('Error:' + err);
                    throw err;
                }
                process.stdout.write(out);
                console.log('Copied From DB;');
                resolve();
            });
        });
    }
}

function getWordDefinitions(inputWord) {
    return ()=>{
        return new Promise((resolve,reject)=>{
            let wordDefinitions = [];
            return wordnet.lookup(inputWord, function(err, definitions) {
                if (definitions) {
                    let wordObject = {
                        word:inputWord,
                        definitions:[]
                    }
                    definitions.forEach(function(definition) {
                        wordObject.definitions.push(definition.glossary);
                        wordDefinitions.push(wordObject);
                    });
                }
                allWords.push(wordDefinitions);
                return resolve();
            });
        });
    }
}

//https://github.com/Harish120896/oxford-dictionary-api

function start() {
    copyFromKindle().then(()=>{
        let promiseLoop = [];
        getWordsFromDB().then((words)=>{
            words.forEach(function(word){
                promiseLoop.push(getWordDefinitions(word));
            });
        }).then(()=>{
            promiseLoop.push(convertWordsIntoPages());
            promiseLoop.push(turnPDFintoImage());

            let chain = Promise.resolve();
            // And append each function in the array to the promise chain
            promiseLoop.forEach((pr, idx, array)=>{
                chain = chain.then(pr).then(()=>{
                    //done
                });
            });
        });
    });
}

function copyFromKindle(){
    //really should get current directory
    return new Promise((resolve,reject)=>{
        exec('cp /Volumes/Kindle/system/vocabulary/vocab.db ./vocab.db', function(err, out, code) {
            if (err instanceof Error){
                process.stderr.write('Error:' + err);
                throw err;
            }
            process.stdout.write(out);
            console.log('Copied From DB;');
            resolve();
        });
    });
}

function getWordsFromDB() {
    return new Promise((resolve,reject)=>{
        sqlite.open('./vocab.db', { Promise }).then(() => {
            let words = [];
            sqlite.all('SELECT `_rowid_`, * FROM `WORDS`').then((results)=>{
                results.forEach(function(row) {
                    words.push(row.word);
                });
                resolve(words);
            });
        });
    });
}

function createImage(){
    var fnt = PImage.registerFont('SourceSansPro-Regular.ttf','Source Sans Pro');
    fnt.load(function() {
        var img = PImage.make(200,200);
        var ctx = img.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = "48pt 'Source Sans Pro'";
        ctx.fillText("ABC", 80, 80);
            PImage.encodePNGToStream(img, fs.createWriteStream('out.png')).then(()=> {
            console.log("wrote out the png file to out.png");
        }).catch((e)=>{
            console.log("there was an error writing");
        });
    });
}


start();