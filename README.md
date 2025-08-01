# CME Files

A modern file server application for CME that provides a web interface for browsing, viewing, and downloading educational files.

## Features

- **Web-based File Browser**: Clean, modern interface for browsing files
- **File Management**: View file details including size and type
- **Download & Preview**: Download files or view them directly in the browser
- **Search Functionality**: Search through files by name (frontend ready)
- **Database-driven**: SQLite database for efficient file cataloging
- **Auto-discovery**: Automatically scans and catalogs files from the `files/` directory
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 with sqlite wrapper
- **Frontend**: EJS templating engine
- **Styling**: Custom CSS with modern design
- **File Handling**: Native Node.js file system operations

## Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd cme-files
   ```
2. **Install dependencies**:

   ```bash
   npm install
   ```
3. **Add your files**:

   - Place your PDF files and other documents in the `files/` directory
   - The application will automatically discover and catalog them on startup
4. **Start the server**:

   ```bash
   npm start
   ```
5. **Access the application**:

   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
cme-files/
├── server.js           # Main Express server
├── db.js              # Database initialization and utilities
├── catalogue.db       # SQLite database (auto-generated)
├── package.json       # Node.js dependencies and scripts
├── files/             # Directory containing the actual files to serve
│   ├── *.pdf         # PDF files (exam answers, practice materials)
│   └── ...           # Other document types
├── public/            # Static assets
│   ├── css/
│   │   └── style.css # Main stylesheet
│   ├── images/
│   │   ├── logo.svg  # CME logo
│   │   └── search.svg # Search icon
│   └── js/           # Client-side JavaScript (if needed)
└── views/
    └── index.ejs     # Main page template
```

## How It Works

1. **Auto-Discovery**: On startup, the application scans the `files/` directory and automatically catalogs all files into a SQLite database
2. **File Cataloging**: Each file gets a unique hash-based ID, formatted display name, size, and type information
3. **Web Interface**: Users can browse files through a clean web interface
4. **File Actions**: Each file can be viewed in-browser or downloaded
5. **Database Storage**: File metadata is stored in SQLite for fast retrieval

## Configuration

The application uses the following default settings:

- **Port**: 3000 (configurable via `PORT` environment variable)
- **Files Directory**: `./files/`
- **Database**: `./catalogue.db`

To change the port:

```bash
PORT=8080 npm start
```

## File Types Supported

The application automatically handles various file types including:

- PDF documents (most common for educational materials)
- Images
- Text files
- Other document formats

Files are served with appropriate MIME types for browser viewing when possible.

## API Endpoints

- `GET /` - Main file browser interface
- `GET /download/:fileId` - Download a specific file
- `GET /view/:fileId` - View a file in the browser

## Development

The application is built with ES modules and uses modern Node.js features. Key files:

- **server.js**: Main application server with Express routes
- **db.js**: Database operations and file scanning logic
- **views/index.ejs**: HTML template for the file browser
- **public/css/style.css**: Styling with CSS custom properties

## Contributing

This is a specialized application for CME educational materials. For modifications:

1. Follow the existing code structure
2. Test file operations thoroughly
3. Ensure the database schema remains compatible
4. Maintain the clean, educational-focused UI design

## License

MIT License

## Author

Miles Edwards
