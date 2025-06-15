import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.join(__dirname, "views"));

app.get('/', async (req, res) => {
    try {
        const db = getDb();
        const filesFromDb = await db.all('SELECT id, name, size, type, filename FROM files'); // filename might be useful for template later
        
        // The template expects an object where keys are file IDs.
        // Convert the array of rows from the DB to this format.
        const filesForTemplate = filesFromDb.reduce((acc, file) => {
            acc[file.id] = { name: file.name, size: file.size, type: file.type };
            return acc;
        }, {});

        res.render('index', { files: filesForTemplate });
    } catch (error) {
        console.error('Error fetching files for homepage:', error);
        res.status(500).send('Error loading file list.');
    }
});

app.get('/download/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const db = getDb();
        const fileInfo = await db.get('SELECT filename FROM files WHERE id = ?', fileId); // Fetch original filename

        if (!fileInfo) {
            return res.status(404).send(`File ID '${fileId}' not recognized in catalogue.`);
        }

        const filePath = path.join(__dirname, 'files', fileInfo.filename); // Use original filename

        res.download(filePath, (err) => {
            if (err) {
                if (err.code === 'ENOENT' || err.status === 404) { // ENOENT for fs errors, status for res.download internal
                    res.status(404).send(`File '${fileInfo.filename}' not found on server.`);
                } else {
                    console.error(`Error downloading file '${fileInfo.filename}' (Path: ${filePath}):`, err);
                    res.status(500).send('Could not download file.');
                }
            }
        });
    } catch (error) {
        console.error(`Error preparing download for file ID '${fileId}':`, error);
        res.status(500).send('Could not prepare file for download.');
    }
});

app.get('/view/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const db = getDb();
        const fileInfo = await db.get('SELECT filename FROM files WHERE id = ?', fileId); // Fetch original filename

        if (!fileInfo || !fileInfo.filename) {
            return res.status(404).send(`File ID '${fileId}' not recognized in catalogue.`);
        }

        const filePath = path.join(__dirname, 'files', fileInfo.filename); // Use original filename

        res.sendFile(filePath, (err) => {
            if (err) {
                if (err.code === 'ENOENT' || err.status === 404) {
                    res.status(404).send(`File '${fileInfo.filename}' not found on server.`);
                } else {
                    console.error(`Error sending file '${fileInfo.filename}' (Path: ${filePath}) for viewing:`, err);
                    res.status(500).send('Could not view file.');
                }
            }
        });
    } catch (error) {
        console.error(`Error preparing view for file ID '${fileId}':`, error);
        res.status(500).send('Could not prepare file for viewing.');
    }
});

(async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server listening at http://localhost:${PORT}`);
            console.log(`Database is stored at: ${path.join(__dirname, 'catalogue.db')}`);
        });
    } catch (error) {
        console.error("Failed to initialize the application:", error);
        process.exit(1);
    }
})();
