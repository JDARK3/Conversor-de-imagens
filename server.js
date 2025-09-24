const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');
const toIco = require('to-ico');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURAÇÕES DE SEGURANÇA ====================
app.use(cors({
    origin: ['https://conversor.jdark.com.br', 'https://www.conversor.jdark.com.br'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== SERVIR ARQUIVOS ESTÁTICOS ====================
app.use(express.static(__dirname, {
    etag: true,
    lastModified: true,
    maxAge: '1d'
}));

// ==================== CONFIGURAÇÃO MULTER ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 
            'image/gif', 'image/webp', 'image/avif', 'image/x-icon'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`), false);
        }
    }
});

// ==================== FORMATOS SUPORTADOS ====================
const ALLOWED_FORMATS = {
    'jpeg': { mime: 'image/jpeg', quality: 90 },
    'jpg': { mime: 'image/jpeg', quality: 90 },
    'png': { mime: 'image/png', compression: 9 },
    'gif': { mime: 'image/gif' },
    'webp': { mime: 'image/webp', quality: 85 },
    'avif': { mime: 'image/avif', quality: 80 },
    'ico': { mime: 'image/x-icon' }
};

// ==================== VALIDAÇÃO DE IMAGEM ====================
async function validateImage(buffer) {
    try {
        const metadata = await sharp(buffer).metadata();
        
        if (metadata.width > 10000 || metadata.height > 10000) {
            throw new Error('Imagem muito grande (máximo: 10000x10000 pixels)');
        }
        
        if (metadata.size > 15 * 1024 * 1024) {
            throw new Error('Imagem muito pesada (máximo: 15MB)');
        }
        
        return metadata;
    } catch (error) {
        throw new Error('Imagem inválida ou corrompida');
    }
}

// ==================== CONVERSÃO ICO PROFISSIONAL ====================
async function convertToIco(buffer) {
    try {
        const sizes = [256, 128, 64, 48, 32, 16];
        const pngBuffers = [];
        
        for (const size of sizes) {
            try {
                const resizedBuffer = await sharp(buffer)
                    .resize(size, size, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos3
                    })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                
                pngBuffers.push(resizedBuffer);
            } catch (error) {
                console.log(`Tamanho ${size} ignorado:`, error.message);
            }
        }
        
        if (pngBuffers.length === 0) {
            throw new Error('Não foi possível gerar o arquivo ICO');
        }
        
        return await toIco(pngBuffers);
    } catch (error) {
        // Fallback: tamanho único
        const fallbackBuffer = await sharp(buffer)
            .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
            
        return await toIco(fallbackBuffer);
    }
}

// ==================== ROTA DE CONVERSÃO PRINCIPAL ====================
app.post('/api/convert', upload.single('image'), async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Validar requisição
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'Nenhuma imagem enviada' 
            });
        }

        const { format } = req.body;
        
        if (!format || !ALLOWED_FORMATS[format]) {
            return res.status(400).json({ 
                success: false,
                error: `Formato não suportado. Use: ${Object.keys(ALLOWED_FORMATS).join(', ')}` 
            });
        }

        console.log(`🔄 Convertendo imagem para: ${format}`);

        // Validar imagem
        const metadata = await validateImage(req.file.buffer);
        console.log(`📊 Imagem: ${metadata.width}x${metadata.height}, ${metadata.format}`);

        let convertedBuffer;
        const formatConfig = ALLOWED_FORMATS[format];

        // CONVERSÃO ESPECÍFICA PARA CADA FORMATO
        if (format === 'ico') {
            convertedBuffer = await convertToIco(req.file.buffer);
        } else if (format === 'gif') {
            convertedBuffer = await sharp(req.file.buffer)
                .gif()
                .toBuffer();
        } else {
            const sharpInstance = sharp(req.file.buffer);
            const options = {};
            
            if (formatConfig.quality) options.quality = formatConfig.quality;
            if (formatConfig.compression) options.compressionLevel = formatConfig.compression;
            
            convertedBuffer = await sharpInstance
                .toFormat(format, options)
                .toBuffer();
        }

        // Log de performance
        const conversionTime = Date.now() - startTime;
        console.log(`✅ Conversão ${format} concluída em ${conversionTime}ms`);

        // Headers de resposta
        res.set({
            'Content-Type': formatConfig.mime,
            'Content-Disposition': `attachment; filename="converted.${format}"`,
            'Content-Length': convertedBuffer.length,
            'X-Conversion-Time': `${conversionTime}ms`,
            'X-Image-Format': format,
            'Cache-Control': 'public, max-age=3600'
        });

        res.send(convertedBuffer);

    } catch (error) {
        console.error('❌ Erro na conversão:', error);
        
        res.status(500).json({ 
            success: false,
            error: error.message,
            suggestion: 'Tente com uma imagem diferente ou outro formato'
        });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor online e funcionando',
        timestamp: new Date().toISOString(),
        supportedFormats: Object.keys(ALLOWED_FORMATS),
        version: '1.0.0'
    });
});

// ==================== ROTA PRINCIPAL ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== MANUSEIO DE ERROS ====================
app.use((error, req, res, next) => {
    console.error('💥 Erro global:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Arquivo muito grande. Máximo: 15MB'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📁 Formatos suportados: ${Object.keys(ALLOWED_FORMATS).join(', ')}`);
    console.log(`⚡ Modo: ${process.env.NODE_ENV || 'development'}`);
});
