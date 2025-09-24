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

    // Formatos suportados para conversão no cliente
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];

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

        showStatus('Convertendo imagem... Aguarde um momento.', 'loading');
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<span>Convertendo...</span>';

        try {
            // Verificar se o formato é suportado
            if (!supportedFormats.includes(format)) {
                if (format === 'ico') {
                    showStatus('⚠️ Conversão para ICO não disponível no modo online. Use JPEG, PNG ou WebP.', 'info');
                } else if (format === 'avif') {
                    showStatus('⚠️ Conversão AVIF pode não funcionar em todos os navegadores. Tente WebP ou PNG.', 'info');
                } else if (format === 'gif') {
                    showStatus('⚠️ Conversão GIF requer servidor backend. Use JPEG, PNG ou WebP.', 'info');
                } else {
                    showStatus('❌ Formato não suportado para conversão no navegador.', 'error');
                }
                return;
            }

            // Conversão no cliente (navegador)
            const convertedBlob = await convertImageClientSide(file, format);
            const filename = `converted_${Date.now()}.${format}`;
            
            downloadFile(convertedBlob, filename);
            showStatus(`✅ Conversão concluída! ${filename} baixado.`, 'success');

        } catch (error) {
            console.error('Erro na conversão:', error);
            showStatus('❌ Erro na conversão: ' + error.message, 'error');
        } finally {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<span>Converter Agora</span>';
        }
    }

    function convertImageClientSide(file, format) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Limpar e desenhar a imagem
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Configurações de formato
                    let mimeType = 'image/png';
                    let quality = 0.92;
                    
                    switch(format) {
                        case 'jpeg':
                        case 'jpg':
                            mimeType = 'image/jpeg';
                            quality = 0.90;
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            quality = 0.85;
                            break;
                        case 'png':
                        default:
                            mimeType = 'image/png';
                            quality = 1.0;
                    }
                    
                    // Converter para blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Falha na conversão da imagem'));
                        }
                    }, mimeType, quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = URL.createObjectURL(file);
        });
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Limpar URL após download
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    showStatus('✨ Conversor pronto! Selecione uma imagem para converter para JPEG, PNG ou WebP.', 'info');
});
