// npm install epub axios fs path jszip
// node epub-generator.ts path/to/your/german.epub

/*
* To translate the German text in the script input and inline the translation in English after each line.
* Generate an epub file with the translated text.
*/

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const EPUB = require('epub');
const JSZip = require('jszip');

const OPENAI_API_KEY = '';

async function translateAndFormatText(text) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant skilled in translating and formatting text for bilingual reading.'
                },
                {
                    role: 'user',
                    content: `Take the following German text, translate the content into English sentence by sentence, and insert the English translation directly after each German sentence. Ensure the output keeps the German and English sentences paired together in an easily readable format.\n\nGerman text:\n\n${text}`
                }
            ],
            max_tokens: 2000 // Adjust as needed for longer texts
        },
        {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.choices[0].message.content.trim();
}

function splitTextIntoChunks(text, maxChunkSize = 3000) {
    const sentences = text.split(/(?<=\.)\s/); // Split by sentences
    const chunks = [];
    let currentChunk = "";

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += sentence + " ";
    });

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

async function translateLargeTextWithLimit(text, maxChunkSize = 3000) {
    const chunks = splitTextIntoChunks(text, maxChunkSize);

    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
        const chunk = chunks[i];
        const translatedChunk = await translateAndFormatText(chunk);
        translatedChunks.push(translatedChunk);
    }

    return translatedChunks.join("\n\n");
}

async function processEpub(inputFilePath) {
    const epub = new EPUB(inputFilePath);

    epub.on('end', async () => {
        let textContent = '';

        for (let i = 0; i < epub.flow.length; i++) {
            const chapter = epub.flow[i];
            const chapterText = await new Promise((resolve, reject) => {
                epub.getChapter(chapter.id, (error, text) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(text);
                    }
                });
            });
            textContent += chapterText;
        }

        console.log(textContent);
    });

    epub.parse();
}

function inlineTranslation(originalText, translatedText) {
    const originalLines = originalText.split('\n');
    const translatedLines = translatedText.split('\n');
    let inlinedText = '';

    for (let i = 0; i < originalLines.length; i++) {
        inlinedText += originalLines[i] + '\n';
        if (translatedLines[i]) {
            inlinedText += translatedLines[i] + '\n';
        }
    }

    return inlinedText;
}

async function processText(inputFilePath) {
    const text = fs.readFileSync(inputFilePath, 'utf8');
    const translatedText = await translateLargeTextWithLimit(text);
    await generateEpub(translatedText, inputFilePath);
}

async function generateEpub(text, inputFilePath) {
    const zip = new JSZip();
    const epubFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '-translated.epub';

    // Escape special characters and format text as valid XHTML
    const escapedText = text.replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;')
                            .replace(/\n/g, '<br/>');

    const xhtmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <title>Translated EPUB</title>
    </head>
    <body>${escapedText}</body>
    </html>`;

    zip.file('OEBPS/content.xhtml', xhtmlContent);
    zip.file('mimetype', 'application/epub+zip');
    zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`);

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:title>Translated EPUB</dc:title>
            <dc:language>en</dc:language>
        </metadata>
        <manifest>
            <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
        <spine>
            <itemref idref="content"/>
        </spine>
    </package>`;
    zip.file('OEBPS/content.opf', contentOpf);

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(epubFileName, content);
    console.log(`Translated EPUB file generated: ${epubFileName}`);
}

// Command line argument for input EPUB file
const inputFilePath = process.argv[2];
if (!inputFilePath) {
    console.error('Please provide the path to the input TXT file.');
    process.exit(1);
}

processText(inputFilePath).catch(err => {
    console.error('Error processing TXT file: ', err);
});
