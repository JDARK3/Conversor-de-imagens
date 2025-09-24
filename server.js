const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const toIco = require('to-ico');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Configuração do multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 1 // apenas 1 arquivo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// Formatos permitidos
const ALLOWED_FORMATS = ['jpeg', 'png', 'gif', 'webp', 'avif', 'ico'];

// Rota de conversão
app.post('/convert', upload.single('image'), async (req, res) => {
    try {
        console.log('Recebendo requisição de conversão');

        const { format } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada!' });
        }

        if (!format || !ALLOWED_FORMATS.includes(format)) {
            return res.status(400).json({ error: 'Formato não suportado!' });
        }

        // Validar dimensões da imagem
        const metadata = await sharp(file.buffer).metadata();
        if (metadata.width > 5000 || metadata.height > 5000) {
            return res.status(400).json({ error: 'Imagem muito grande! Máximo: 5000x5000 pixels' });
        }

        let convertedImage;
        let contentType;

        if (format === 'ico') {
            try {
                // Criar múltiplos tamanhos para o ICO (melhor compatibilidade)
                const sizes = [256, 128, 64, 48, 32, 16];
                const pngBuffers = [];

                for (const size of sizes) {
                    try {
                        const resizedBuffer = await sharp(file.buffer)
                            .resize(size, size, {
                                fit: 'contain',
                                background: { r: 0, g: 0, b: 0, alpha: 0 },
                                kernel: sharp.kernel.lanczos3
                            })
                            .png({
                                compressionLevel: 9,
                                adaptiveFiltering: true
                            })
                            .toBuffer();

                        pngBuffers.push(resizedBuffer);
                    } catch (sizeError) {
                        console.log(`Tamanho ${size}x${size} ignorado:`, sizeError.message);
                        // Continua com os outros tamanhos
                    }
                }

                if (pngBuffers.length === 0) {
                    throw new Error('Não foi possível gerar nenhum tamanho de ícone');
                }

                // Gerar ICO
                convertedImage = await toIco(pngBuffers, {
                    sizes: pngBuffers.map((buf, i) => sizes[i])
                });

                contentType = 'image/x-icon';

            } catch (icoError) {
                console.error('Erro na geração do ICO:', icoError);
                // Fallback: tentar apenas um tamanho
                const fallbackBuffer = await sharp(file.buffer)
                    .resize(64, 64, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .png()
                    .toBuffer();

                convertedImage = await toIco([fallbackBuffer]);
                contentType = 'image/x-icon';
            }
        } else {
            // Configurações para outros formatos
            const formatOptions = {};

            if (format === 'jpeg') {
                formatOptions.quality = 90;
                formatOptions.mozjpeg = true;
            } else if (format === 'png') {
                formatOptions.compressionLevel = 9;
            } else if (format === 'webp') {
                formatOptions.quality = 90;
            } else if (format === 'avif') {
                formatOptions.quality = 80;
            }

            convertedImage = await sharp(file.buffer)
                .toFormat(format, formatOptions)
                .toBuffer();

            contentType = `image/${format}`;
        }

        // Verificar se o buffer é válido
        if (!convertedImage || !Buffer.isBuffer(convertedImage)) {
            throw new Error('Buffer de imagem convertida é inválido');
        }

        // Configurar headers corretamente
        res.set({
            'Content-Type': contentType,
            'Content-Length': convertedImage.length,
            'Content-Disposition': `attachment; filename="converted.${format}"`,
            'Cache-Control': 'no-cache'
        });

        // Enviar como buffer binário
        res.send(convertedImage);

    } catch (error) {
        console.error('Erro na conversão:', error);
        res.status(500).json({
            error: 'Erro na conversão: ' + error.message,
            details: 'Para ICO, use imagens quadradas com fundo transparente para melhor resultado'
        });
    }
});

// Healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'online', message: 'Servidor funcionando' });
});

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando em http://localhost:${port}`);
});