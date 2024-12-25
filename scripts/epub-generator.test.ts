import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { splitTextIntoChunks, prepareBatchFile, uploadFile, createBatch, queryBatchStatus, retrieveBatchResults, generateEpub } from './epub-generator';

jest.mock('fs');
jest.mock('openai');

const OPENAI_API_KEY = 'sk-someapikeyhere';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

describe('epub-generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('splitTextIntoChunks', () => {
    it('should split text into chunks of specified size', () => {
      const text = 'This is a sentence. This is another sentence. This is yet another sentence.';
      const chunks = splitTextIntoChunks(text, 30);
      expect(chunks).toEqual([
        'This is a sentence.',
        'This is another sentence.',
        'This is yet another sentence.'
      ]);
    });
  });

  describe('prepareBatchFile', () => {
    it('should prepare a batch file with requests', async () => {
      const inputFilePath = 'path/to/input.txt';
      const text = 'This is a sentence. This is another sentence. This is yet another sentence.';
      (fs.readFileSync as jest.Mock).mockReturnValue(text);

      const batchFilePath = await prepareBatchFile(inputFilePath);
      expect(batchFilePath).toBe(path.join(path.dirname(inputFilePath), 'batchinput.json1'));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        batchFilePath,
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload a file and return the file ID', async () => {
      const inputFilePath = 'path/to/input.txt';
      const fileId = 'file-123';
      (openai.files.create as jest.Mock).mockResolvedValue({ id: fileId });

      const result = await uploadFile(inputFilePath);
      expect(result).toBe(fileId);
    });
  });

  describe('createBatch', () => {
    it('should create a batch and log the batch ID and output file ID', async () => {
      const inputFilePath = 'path/to/input.txt';
      const fileId = 'file-123';
      const batchId = 'batch-123';
      const outputFileId = 'output-123';
      (openai.files.create as jest.Mock).mockResolvedValue({ id: fileId });
      (openai.batches.create as jest.Mock).mockResolvedValue({ id: batchId, output_file_id: outputFileId });

      console.log = jest.fn();
      await createBatch(inputFilePath);
      expect(console.log).toHaveBeenCalledWith(`Batch created with ID: ${batchId}`);
      expect(console.log).toHaveBeenCalledWith(`Output file ID: ${outputFileId}`);
    });
  });

  describe('queryBatchStatus', () => {
    it('should query the batch status and log it', async () => {
      const batchId = 'batch-123';
      const status = 'completed';
      (openai.batches.retrieve as jest.Mock).mockResolvedValue({ status });

      console.log = jest.fn();
      await queryBatchStatus(batchId);
      expect(console.log).toHaveBeenCalledWith(`Batch status: ${status}`);
    });
  });

  describe('retrieveBatchResults', () => {
    it('should retrieve batch results and log the translated text', async () => {
      const outputFileId = 'output-123';
      const translatedText = 'Translated text';
      (openai.files.content as jest.Mock).mockResolvedValue({
        text: jest.fn().mockResolvedValue(translatedText)
      });

      console.log = jest.fn();
      await retrieveBatchResults(outputFileId);
      expect(console.log).toHaveBeenCalledWith(`Translated text: ${translatedText}`);
    });
  });

  describe('generateEpub', () => {
    it('should generate an EPUB file with the translated text', async () => {
      const text = 'Translated text';
      const inputFilePath = 'path/to/input.txt';
      const epubFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '-translated.epub';

      await generateEpub(text, inputFilePath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        epubFileName,
        expect.any(Buffer)
      );
    });
  });
});

// Mock process.exit to prevent it from terminating the test process
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit: ${code}`);
});