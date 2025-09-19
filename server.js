const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/convert', upload.single('image'), async (req, res) => {
    try {
        const { format } = req.body;
        const imageBuffer = req.file.buffer;

        const convertedImage = await sharp(imageBuffer)
            .toFormat(format)
            .toBuffer();

        res.set('Content-Type', `image/${format}`);
        res.send(convertedImage);
    } catch (error) {
        res.status(500).send('Erro na conversão: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});