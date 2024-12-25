// npm install epub fs path jszip openai
// npx tsc epub-generator.ts
// node dist/epub-generator.js create-batch path/to/your/german.txt
// node dist/epub-generator.js query-status batch_id batch_676bab635d6c819080610af3c916ecfa
// node dist/epub-generator.js retrieve-results output_file_id

/*
* To translate the German text in the script input and inline the translation in English after each line.
* Generate an epub file with the translated text.
*/

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import OpenAI from 'openai';

const OPENAI_API_KEY = '';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface Request {
    custom_id: string;
    method: string;
    url: string;
    body: {
        model: string;
        messages: { role: string; content: string }[];
        max_tokens: number;
    };
}

export function splitTextIntoChunks(text: string, maxChunkSize = 3000): string[] {
    const sentences = text.split(/(?<=\.)\s/); // Split by sentences
    const chunks: string[] = [];
    let currentChunk = '';

    sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += sentence + ' ';
    });

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

export async function prepareBatchFile(inputFilePath: string): Promise<string> {
    const text = fs.readFileSync(inputFilePath, 'utf8');
    const chunks = splitTextIntoChunks(text, 3000);
    const requests: Request[] = chunks.map((chunk, index) => ({
        custom_id: `request-${index + 1}`,
        method: 'POST',
        url: '/v1/chat/completions',
        body: {
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: `Translate the following German text to English and insert the English translation directly after each German sentence:\n\n${chunk}` }
            ],
            max_tokens: 2000 // Adjust as needed for longer texts
        }
    }));

    const batchFilePath = path.join(path.dirname(inputFilePath), 'batchinput.jsonl');
    fs.writeFileSync(batchFilePath, requests.map(req => JSON.stringify(req)).join('\n'), 'utf8');
    return batchFilePath;
}

export async function uploadFile(filePath: string): Promise<string> {
    const batchFilePath = await prepareBatchFile(filePath);

    try {
        const file = await openai.files.create({
            file: fs.createReadStream(batchFilePath),
            purpose: 'batch',
        });

        return file.id;
    } catch (error: any) {
        console.error('Error uploading file:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function createBatch(inputFilePath: string): Promise<void> {
    const fileId = await uploadFile(inputFilePath);

    try {
        const batch = await openai.batches.create({
            input_file_id: fileId,
            endpoint: '/v1/chat/completions',
            completion_window: '24h'
        });

        console.log(`Batch created with ID: ${batch.id}`);
        console.log(`Output file ID: ${batch.output_file_id}`);
    } catch (error: any) {
        console.error('Error creating batch:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function queryBatchStatus(batchId: string): Promise<void> {
    try {
        const batch = await openai.batches.retrieve(batchId);
        console.log(`Batch status: ${batch.status}`);
    } catch (error: any) {
        console.error('Error querying batch status:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function retrieveBatchResults(outputFileId: string): Promise<void> {
    try {
        const fileResponse = await openai.files.content(outputFileId);
        const fileContents = await fileResponse.text();

        console.log(`Translated text: ${fileContents}`);
        generateEpub(fileContents, outputFileId);
    } catch (error: any) {
        console.error('Error retrieving batch results:', error.response ? error.response.data : error.message);
        throw error;
    }
}

export async function generateEpub(text: string, inputFilePath: string): Promise<void> {
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

export function handleCommandLineArgs(): void {
    const command = process.argv[2];
    const inputFilePathOrBatchIdOrOutputFileId = process.argv[3];

    if (!command || !inputFilePathOrBatchIdOrOutputFileId) {
        console.error('Please provide a command and the necessary arguments.');
        process.exit(1);
    }

    if (command === 'create-batch') {
        createBatch(inputFilePathOrBatchIdOrOutputFileId).catch(err => {
            console.error('Error creating batch: ', err);
        });
    } else if (command === 'query-status') {
        queryBatchStatus(inputFilePathOrBatchIdOrOutputFileId).catch(err => {
            console.error('Error querying batch status: ', err);
        });
    } else if (command === 'retrieve-results') {
        retrieveBatchResults(inputFilePathOrBatchIdOrOutputFileId).catch(err => {
            console.error('Error retrieving batch results: ', err);
        });
    } else {
        console.error('Invalid command. Use "create-batch", "query-status", or "retrieve-results".');
        process.exit(1);
    }
}

// Only call handleCommandLineArgs if this script is run directly from the command line, and not in tests
if (require.main === module) {
    handleCommandLineArgs();
}