document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Conversor de Imagens JDark - Modo Online');

    // Elementos do DOM
    const fileInput = document.getElementById('uploader');
    const fileName = document.getElementById('file-name');
    const fileType = document.getElementById('file-type');
    const fileSize = document.getElementById('file-size');
    const fileDimensions = document.getElementById('file-dimensions');
    const convertBtn = document.getElementById('convert-btn');
    const formatSelect = document.getElementById('format');
    const statusDiv = document.getElementById('status');
    const imagePreview = document.getElementById('image-preview');
    const icoWarning = document.getElementById('ico-warning');
    const uploadLabel = document.querySelector('.custom-file-upload');
    const dropArea = document.getElementById('drop-area');

    // Mostrar/ocultar aviso do ICO
    formatSelect.addEventListener('change', function() {
        if (this.value === 'ico') {
            icoWarning.style.display = 'block';
        } else {
            icoWarning.style.display = 'none';
        }
    });

    // Funções de utilidade
    function formatFileSize(bytes) {
        if (!bytes) return '-';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function showStatus(message, type = 'info') {
        const icons = {
            success: '✅',
            error: '❌',
            loading: '⏳',
            info: 'ℹ️'
        };
        
        statusDiv.innerHTML = `${icons[type] || ''} ${message}`;
        statusDiv.className = 'status-message';
        statusDiv.classList.add(`status-${type}`);
        statusDiv.style.display = 'block';

        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', convertImage);
    uploadLabel.addEventListener('click', () => fileInput.click());

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => e.preventDefault());
        document.body.addEventListener(eventName, e => e.preventDefault());
    });

    dropArea.addEventListener('drop', handleFileDrop);

    // Handlers
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            processSelectedFile(file);
        } else {
            showStatus('Por favor, selecione uma imagem válida (JPEG, PNG, GIF, etc.)', 'error');
        }
    }

    function handleFileDrop(e) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            fileInput.files = e.dataTransfer.files;
            processSelectedFile(file);
        } else {
            showStatus('Arquivo inválido! Selecione uma imagem.', 'error');
        }
    }

    function processSelectedFile(file) {
        updateFileInfo(file);
        showImagePreview(file);
        showStatus('Imagem carregada com sucesso! Clique em "Converter Agora".', 'success');
    }

    function updateFileInfo(file) {
        fileName.textContent = file.name;
        fileType.textContent = file.type || 'Não identificado';
        fileSize.textContent = formatFileSize(file.size);
        fileDimensions.textContent = 'Carregando...';

        // Obter dimensões da imagem
        const img = new Image();
        img.onload = function() {
            fileDimensions.textContent = `${this.width} × ${this.height} pixels`;
        };
        img.onerror = function() {
            fileDimensions.textContent = 'Não disponível';
        };
        img.src = URL.createObjectURL(file);
    }

    function showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.innerHTML = `
                <div style="text-align: center;">
                    <img src="${e.target.result}" alt="Pré-visualização" 
                         style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 2px solid #4CAF50;">
                    <p style="margin-top: 10px; color: #7fdbda; font-weight: bold;">Pré-visualização</p>
                </div>
            `;
        };
        reader.onerror = function() {
            imagePreview.innerHTML = '<p style="color: #ff6b6b;">Erro ao carregar pré-visualização</p>';
        };
        reader.readAsDataURL(file);
    }

    async function convertImage() {
        const file = fileInput.files[0];
        const format = formatSelect.value;

        if (!file) {
            showStatus('Por favor, selecione uma imagem primeiro!', 'error');
            return;
        }

        // Verificar formatos não suportados
        if (format === 'ico' || format === 'gif' || format === 'avif') {
            showStatus('⚠️ Este formato requer servidor backend. Use JPEG, PNG ou WebP.', 'info');
            return;
        }

        showStatus('Convertendo imagem... Aguarde um momento.', 'loading');
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span>Convertendo...</span>';

        try {
            // Conversão no cliente (navegador)
            const convertedBlob = await convertImageClientSide(file, format);
            
            if (convertedBlob) {
                const filename = `converted_${Date.now()}.${format}`;
                downloadFile(convertedBlob, filename);
                showStatus(`✅ Conversão concluída! ${filename} baixado.`, 'success');
            } else {
                showStatus('❌ Falha na conversão da imagem.', 'error');
            }

        } catch (error) {
            console.error('Erro na conversão:', error);
            showStatus('❌ Erro: ' + error.message, 'error');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span>Converter Agora</span>';
        }
    }

    function convertImageClientSide(file, format) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Configurar canvas com as dimensões da imagem
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Desenhar a imagem no canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Configurar formato e qualidade
                    let mimeType;
                    let quality = 0.9;
                    
                    switch(format) {
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            quality = 1.0;
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            break;
                        default:
                            mimeType = 'image/png';
                    }
                    
                    // Converter canvas para blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Não foi possível converter a imagem'));
                        }
                    }, mimeType, quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Erro ao carregar a imagem'));
            img.src = URL.createObjectURL(file);
        });
    }

    function downloadFile(blob, filename) {
        try {
            // Criar URL para o blob
            const url = URL.createObjectURL(blob);
            
            // Criar link de download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            // Adicionar ao documento e clicar
            document.body.appendChild(a);
            a.click();
            
            // Limpar
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Erro no download:', error);
            throw new Error('Falha ao baixar arquivo');
        }
    }

    // Efeitos visuais para drag and drop
    dropArea.addEventListener('dragenter', () => {
        dropArea.style.borderColor = '#4CAF50';
        dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.style.borderColor = '#3a7ca5';
        dropArea.style.backgroundColor = 'rgba(30, 58, 95, 0.3)';
    });

    dropArea.addEventListener('drop', () => {
        dropArea.style.borderColor = '#3a7ca5';
        dropArea.style.backgroundColor = 'rgba(30, 58, 95, 0.3)';
    });

    // Inicialização
    showStatus('✨ Conversor pronto! Selecione uma imagem para converter.', 'info');
});
