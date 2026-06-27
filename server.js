const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS dasar untuk meloloskan player
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// Endpoint Utama Proxy (Tinggal panggil /proxy?url=...)
app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send("Error: Missing 'url' query parameter.");
    }

    // Gabungkan kembali sisa query string jika ada token/hash biner stream
    const queryParams = { ...req.query };
    delete queryParams.url;
    const searchParams = new URLSearchParams(queryParams).toString();
    if (searchParams) {
        targetUrl += (targetUrl.includes("?") ? "&" : "?") + searchParams;
    }

    try {
        const forwardHeaders = {
            "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
            "Accept": "*/*"
        };

        // Inject header khusus jika targetnya Starhub
        if (targetUrl.includes("starhub")) {
            forwardHeaders["Referer"] = "https://www.starhub.com/";
            forwardHeaders["Origin"] = "https://www.starhub.com";
        }

        const targetResponse = await fetch(targetUrl, {
            method: "GET",
            headers: forwardHeaders,
            redirect: "follow"
        });

        // Teruskan jenis Content-Type dari server asal (.mpd atau file biner video)
        res.setHeader("Content-Type", targetResponse.headers.get("content-type") || "text/plain");
        
        // Alirkan data (pipe) langsung dari target ke player agar menghemat memory RAM
        targetResponse.body.pipe(res);

    } catch (error) {
        res.status(500).send("Proxy Error: " + error.message);
    }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
