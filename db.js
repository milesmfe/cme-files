import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'catalogue.db');
let dbInstance;

// Helper function to format file size
function formatFileSize(bytes, decimalPoint = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimalPoint < 0 ? 0 : decimalPoint;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to generate a hash for the ID
function generateHashId(filename) {
    return crypto.createHash('sha256').update(filename).digest('hex');
}

// Helper function to create a display-friendly name
function formatDisplayName(originalFilename) {
    let nameWithoutExt = path.basename(originalFilename, path.extname(originalFilename));
    // Replace underscores with spaces, then split by space or camelCase transitions
    nameWithoutExt = nameWithoutExt.replace(/_/g, ' ');
    // Add a space before uppercase letters (for camelCase) then split
    return nameWithoutExt.replace(/([A-Z])/g, ' $1').trim()
        .split(/\s+/) // Split by one or more spaces
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter of each word, lowercase rest
        .join(' ');
}

export async function initializeDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });

    await dbInstance.exec('PRAGMA foreign_keys = ON;');

    // Create the files table if it doesn't exist
    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            size TEXT,
            type TEXT NOT NULL,
            filename TEXT NOT NULL
        );
    `);
    console.log('Database initialized and "files" table ensured.');

    // Seed database from JSON if table is empty and JSON file exists
    await seedDatabaseIfEmpty(dbInstance);

    return dbInstance;
}

async function populateDbFromCatalogueData(db, catalogueData) {
    if (!catalogueData || Object.keys(catalogueData).length === 0) {
        console.log("No catalogue data provided to populate the database.");
        return;
    }
    try {
        await db.exec('BEGIN TRANSACTION');
        const stmt = await db.prepare('INSERT INTO files (id, name, size, type, filename) VALUES (?, ?, ?, ?, ?)');
        for (const [id, details] of Object.entries(catalogueData)) {
            if (details && typeof details.name === 'string' && typeof details.type === 'string' && typeof details.filename === 'string') {
                await stmt.run(id, details.name, details.size || null, details.type, details.filename);
            } else {
                console.warn(`Skipping invalid catalogue entry for ID '${id}':`, details);
            }
        }
        await stmt.finalize();
        await db.exec('COMMIT');
        console.log('Database seeded successfully.');
    } catch (error) {
        try {
            await db.exec('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error during ROLLBACK after seeding failure:', rollbackError);
        }
        console.error('Error populating database from catalogue data:', error);
        throw error;
    }
}

async function seedDatabaseIfEmpty(db) {
    const countResult = await db.get('SELECT COUNT(*) as count FROM files');
    if (countResult && countResult.count > 0) {
        console.log('Database already contains data. Skipping seed.');
        return;
    }

    let catalogueDataToSeed = null; 

    // Always attempt to seed by scanning the /files directory if DB is empty
    console.log('Attempting to seed database by scanning the /files directory...');
    const filesDir = path.join(__dirname, 'files');
    try {
        // Check if filesDir exists before trying to read it
        await fs.access(filesDir); // Throws error if not accessible

            const dirents = await fs.readdir(filesDir, { withFileTypes: true });
            const actualFiles = dirents.filter(dirent => dirent.isFile());

            if (actualFiles.length === 0) {
                console.log('No files found in /files directory. Database will remain empty.');
                return;
            }

            const scannedCatalogue = {};
            for (const file of actualFiles) {
                const originalFileName = file.name; // e.g., my_document.pdf

                // Skip hidden files (like .DS_Store) or files that might not have a proper base name
                if (originalFileName.startsWith('.')) {
                    console.log(`Skipping hidden file: ${originalFileName}`);
                    continue;
                }

                const fileIdHash = generateHashId(originalFileName);
                const displayName = formatDisplayName(originalFileName);
                const fileExt = path.extname(originalFileName);
                const filePath = path.join(filesDir, originalFileName);
                const stats = await fs.stat(filePath);

                scannedCatalogue[fileIdHash] = { // Use hash as the key for the catalogue object
                    name: displayName,
                    size: formatFileSize(stats.size),
                    type: fileExt,
                    filename: originalFileName // Store the original filename
                };
            }

            if (Object.keys(scannedCatalogue).length > 0) {
                catalogueDataToSeed = scannedCatalogue;
            } else {
                console.log('No suitable files found in /files directory after filtering. Database will remain empty.');
                return;
            }
    } catch (scanError) {
        if (scanError.code === 'ENOENT') {
            console.log(`Warning: /files directory not found at ${filesDir}. Database will remain empty.`);
        } else {
            console.error('Error scanning /files directory:', scanError);
        }
        return; // Stop seeding if there's an error scanning or directory doesn't exist
    }
    // Populate DB if we have data from scanning
    if (catalogueDataToSeed) {
        try {
            await populateDbFromCatalogueData(db, catalogueDataToSeed);
        } catch (dbError) {
            // Error is already logged by populateDbFromCatalogueData
            console.error('Seeding process failed.');
        }
    } else {
        console.log('No data available for seeding. Database will be empty.');
    }
}

export function getDb() {
    if (!dbInstance) {
        throw new Error("Database not initialized. Call initializeDatabase() first.");
    }
    return dbInstance;
}