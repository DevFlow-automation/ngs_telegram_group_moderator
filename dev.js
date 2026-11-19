import http from 'node:http';
import handler from './index.js';

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => handler(req, res));

server.listen(PORT, () => {
    console.log(`NGS Olympiad Portal running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
