import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

// Proxy search 
app.get("/api/search", async (req, res) => {
    const query = req.query.q;
    const url = 'https://api.deezer.com/search?q=${encodeURIComponent(q)}'; 
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});

// tracklist details 
app.get("/api/tracklist/:id", async (req, res) => {
    const id = req.params.id;
    const url = `https://api.deezer.com/playlist/${id}`; 
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
});

// Enable CORS for all routes
app.use(cors());

app.listen(PORT, () => console.log(`Proxy listening on ${PORT}`));