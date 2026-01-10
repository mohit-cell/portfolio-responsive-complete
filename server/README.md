# Resume Proxy Server

This small Express server exposes a single endpoint `/api/chat` that accepts `{ question }` and forwards it to OpenAI using the server-side API key stored in `../.env` as `OPENAI_API_KEY`.

Setup

1. Ensure your OpenAI API key is set in `../.env` (project root):

```
OPENAI_API_KEY=sk-...
PORT=3000
```

2. From the `server/` folder install dependencies:

```bash
cd server
npm install
```

3. Start the server:

```bash
npm start
```

4. Open `http://localhost:3000` to view the static site served by the parent dir (optional). The chat widget will call `/api/chat` automatically.

Security notes

- Keep `OPENAI_API_KEY` out of version control. Do not commit `.env`.
- Configure CORS origin in `index.js` for production.
- Add authentication or stricter rate limits if publicly exposing the endpoint.
