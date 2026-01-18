# Gopya

**Secure, ephemeral, client-side encrypted secret sharing.**

Gopya allows you to share sensitive information (passwords, keys, tokens) securely via a one-time link. The secret is encrypted in your browser before it ever reaches the server, and the server never holds the encryption key or the plaintext.

## Features

- **End-to-End Encryption**: Secrets are encrypted with AES-256-GCM in the browser using the Web Crypto API.
- **Zero Knowledge Architecture**: The server stores only the ciphertext. It cannot decrypt your secrets.
- **One-Time Access**: Secrets are destroyed immediately after being retrieved once.
- **Auto-Expiry**: Secrets are automatically deleted if not read within the specified time.
- **Password Protection**: Optional additional password layer derived via PBKDF2.
- **Authentication Gate**: Prevents accidental deletion by requiring valid proof of key before "burning" the secret.

## Quick Start (Docker)

The easiest way to run Gopya locally is with Docker Compose.

1.  Clone the repository.
2.  Run the application:
    ```bash
    docker-compose up --build
    ```
3.  Open `http://localhost:3000` in your browser.

## Manual Installation

If you prefer to run it without Docker, follow these steps.

### Prerequisites

- Node.js (v18+)
- MySQL (v8.0)

### Setup Steps

1.  **Configure Environment**
    Copy the example configuration to the backend config directory:
    ```bash
    cp config/example.env backend/config/.env
    ```
    Open `backend/config/.env` and adjust the database credentials if necessary.

2.  **Database Setup**
    Ensure your MySQL server is running, then create the database and tables:
    ```bash
    mysql -u root -p < scripts/db/migrate.sql
    ```

3.  **Install Dependencies**
    Navigate to the backend directory and install packages:
    ```bash
    cd backend
    npm install
    ```

4.  **Start the Server**
    Start the development server:
    ```bash
    npm run dev
    ```
    The server will start on port 3000 (or as configured).

5.  **Access the App**
    The backend is configured to serve the frontend static files automatically.
    Open `http://localhost:3000` in your web browser.

## Architecture

- **Frontend**: Vanilla Javascript (ES Modules), CSS3 (Variables, Flexbox/Grid), FontAwesome Icons.
- **Backend**: Node.js, Express.
- **Database**: MySQL.
- **Security**:
    - **Encryption**: AES-GCM (256-bit) via `window.crypto.subtle`.
    - **Key Derivation**: PBKDF2 with SHA-256 and 150,000 iterations.
    - **Authentication Gate**: Server validates a hash of the key (`SHA256(Key)`) before deletion.
    - **Transport**: Secrets are only decrypted in the browser.

## API Reference

### Create Secret
`POST /api/secret`

Creates a new secret. The body must contain the encrypted data.

**Request Body:**
- `ciphertext`: Base64 string of the encrypted secret.
- `iv`: Base64 string of the initialization vector.
- `salt`: Base64 string of the salt used for key derivation.
- `passwordHash`: (Optional) Hash of the authentication key (derived from password/key).
- `expiresInMinutes`: (Integer) Time until the secret expires.

**Response:**
- `token`: The unique access token.
- `expiresAt`: Timestamp of expiration.

### Read Secret
`POST /api/secret/:token`

Retrieves and permanently deletes the secret. Requires authentication proof.

**Request Body:**
- `authKey`: (String) SHA256 hash of the decryption key/password.

**Response:**
- `ciphertext`: Base64 string.
- `iv`: Base64 string.
- `salt`: Base64 string.
- `expiresAt`: Timestamp.
