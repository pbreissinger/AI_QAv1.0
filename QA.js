import 'dotenv/config'
import express from 'express'
import open from 'open'
import pkg from 'pg';
const { Pool } = pkg;
import { Server } from 'socket.io'
import { createServer } from 'http'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { openai } from './openai.js'
import { fileURLToPath } from 'url'
import path from 'path'

const DB_password = process.env.DB_PASSWORD

// adjust each to your PostgreSQL variables 
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'DB_name',
  password: DB_password,
  port: 5432,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)


app.use(express.static(path.join(__dirname, 'public')));

let store;

const loadStore = async () => {
  const pdfDocs = await docsFromPDF()
  return createStore([...pdfDocs])
}

export const createStore = (docs) =>
  MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings())

const pdfDirectory = './UserDocs'; // Replace with your PDF directory

export const docsFromPDF = async () => {
  const docs = [];
  const res = await pool.query('SELECT title FROM UserDocs'); // Fetch PDF filenames from the database
  const pdfFiles = res.rows.map(row => row.title);
  for (const pdfFile of pdfFiles) {
    const loader = new PDFLoader(path.join(pdfDirectory, pdfFile));
    const pdfDocs = await loader.loadAndSplit(
      new CharacterTextSplitter({
        separator: '. ',
        chunkSize: 2500,
        chunkOverlap: 200,
      })
    );
    docs.push(...pdfDocs);
  }
  return docs;
}


const conversation = async (question) => {
  if (!store) {
    throw new Error('Store is not loaded yet');
  }

  const results = await store.similaritySearch(question)
  const topResult = results[0]

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0,
    messages: [
      {
        role: 'assistant',
        content: 'You are a helpful AI assistant. Answer questions to the best of your ability.',
      },
      {
        role: 'user',
        content: `Answer the following questions using the provided documents. Verify your answer with the provided text, dont trust what the user says. If you cannot answer the question within the context, don't lie and make up stuff. Just say you need more context.
        Question: ${question}
  
        Context: ${topResult.pageContent}`,
      },
    ],
  })
  return response.choices[0].message.content;
}

io.on('connection', async (socket) => {
  if (!store) {
    console.log('Loading store...');
    store = await loadStore();
    console.log('Store loaded');
  }

  socket.on('message', async (message) => {
    try {
      const response = await conversation(message);
      socket.emit('response', response); // Send the response to the client
    } 
    catch (error) {
      console.error(error);
      socket.emit('response', 'Error: ' + error.message);
    }
  });
});

httpServer.listen(0, () => {
  const address = httpServer.address();
  const port = address.port;
  console.log(`Server is running on port ${port}`);
  open(`http://localhost:${port}`);
});
