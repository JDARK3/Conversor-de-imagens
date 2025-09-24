document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Conversor de Imagens JDark - Modo Navegador');

    // Elementos do DOM
    const elements = {
        fileInput: document.getElementById('uploader'),
        fileName: document.getElementById('file-name'),
        fileType: document.getElementById('file-type'),
        fileSize: document.getElementById('file-size'),
        fileDimensions: document.getElementById('file-dimensions'),
        convertBtn: document.getElementById('convert-btn'),
        formatSelect: document.getElementById('format'),
        statusDiv: document.getElementById('status'),
        imagePreview: document.getElementById('image-preview'),
        icoWarning: document.getElementById('ico-warning'),
        uploadLabel: document.querySelector('.custom-file-upload'),
        dropArea: document.getElementById('drop-area')
    };

    // Formatos suportados no navegador
    const supportedFormats = {
        'jpeg': { name: 'JPEG', mime: 'image/jpeg', quality: 0.92 },
        'jpg': { name: 'JPG', mime: 'image/jpeg', quality: 0.92 },
        'png': { name: 'PNG', mime: 'image/png', quality: 1.0 },
        'webp': { name: 'WebP', mime: 'image/webp', quality: 0.85 }
    };

    // Formatos com fallback
    const fallbackFormats = {
        'gif': { name: 'GIF', fallback: 'png', message: 'GIF convertido para PNG' },
        'avif': { name: 'AVIF', fallback: 'webp', message: 'AVIF convertido para WebP' },
        'ico': { name: 'ICO', fallback: 'png', message: 'ICO não suportado. Use PNG para ícones' }
    };

    let currentFile = null;

    // ==================== INICIALIZAÇÃO ====================
    init();

    function init() {
        setupEventListeners();
        showStatus('✨ Conversor pronto! Selecione uma imagem.', 'info');
        updateFormatOptions();
    }

    // ==================== CONFIGURAÇÃO DE EVENTOS ====================
    function setupEventListeners() {
        elements.fileInput.addEventListener('change', handleFileSelect);
        elements.convertBtn.addEventListener('click', handleConversion);
        elements.uploadLabel.addEventListener('click', () => elements.fileInput.click());
        elements.formatSelect.addEventListener('change', handleFormatChange);

        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, preventDefaults);
        });
        
        elements.dropArea.addEventListener('drop', handleFileDrop);
        setupDragEffects();
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ==================== ATUALIZAR OPÇÕES DE FORMATO ====================
    function updateFormatOptions() {
        // Manter as opções do HTML, apenas ajustar o comportamento
        console.log('📋 Formatos disponíveis:', {
            suportados: Object.keys(supportedFormats),
            comFallback: Object.keys(fallbackFormats)
        });
    }

    // ==================== MANIPULAÇÃO DE ARQUIVOS ====================
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) processFile(file);
    }

    function handleFileDrop(e) {
        const file = e.dataTransfer.files[0];
        if (file) {
            elements.fileInput.files = e.dataTransfer.files;
            processFile(file);
        }
    }

    function handleFormatChange() {
        const format = elements.formatSelect.value;
        elements.icoWarning.style.display = format === 'ico' ? 'block' : 'none';
    }

    async function processFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('❌ Selecione um arquivo de imagem válido.', 'error');
            return;
        }

        try {
            currentFile = file;
            updateFileInfo(file);
            await showImagePreview(file);
            
            const formatInfo = getFormatInfo(elements.formatSelect.value);
            showStatus(`✅ Imagem carregada! Pronto para converter para ${formatInfo.name}.`, 'success');
            
        } catch (error) {
            showStatus('❌ Erro ao processar a imagem.', 'error');
            console.error('Erro:', error);
        }
    }

    // ==================== INFORMAÇÕES DO ARQUIVO ====================
    function updateFileInfo(file) {
        elements.fileName.textContent = file.name;
        elements.fileType.textContent = file.type || 'Não identificado';
        elements.fileSize.textContent = formatFileSize(file.size);
        elements.fileDimensions.textContent = 'Carregando...';

        // Obter dimensões
        const img = new Image();
        img.onload = function() {
            elements.fileDimensions.textContent = `${this.width} × ${this.height} pixels`;
        };
        img.onerror = function() {
            elements.fileDimensions.textContent = 'Não disponível';
        };
        img.src = URL.createObjectURL(file);
    }

    async function showImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                elements.imagePreview.innerHTML = `
                    <div style="text-align: center;">
                        <img src="${e.target.result}" alt="Pré-visualização" 
                             style="max-width: 300px; max-height: 300px; border-radius: 8px; border: 2px solid #4CAF50;">
                        <p style="margin-top: 10px; color: #7fdbda; font-weight: bold;">Pré-visualização</p>
                    </div>
                `;
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    // ==================== CONVERSÃO PRINCIPAL ====================
    async function handleConversion() {
        if (!currentFile) {
            showStatus('❌ Selecione uma imagem primeiro.', 'error');
            return;
        }

        const selectedFormat = elements.formatSelect.value;
        const formatInfo = getFormatInfo(selectedFormat);
        
        showStatus(`⏳ Convertendo para ${formatInfo.name}...`, 'loading');
        setButtonState(true);

        try {
            let result;
            
            if (formatInfo.fallback) {
                // Formato com fallback
                result = await convertWithFallback(currentFile, selectedFormat, formatInfo);
            } else {
                // Formato nativamente suportado
                result = await convertImageNative(currentFile, formatInfo);
            }

            await downloadFile(result.blob, result.filename);
            showStatus(`✅ ${result.message}`, 'success');

        } catch (error) {
            console.error('Erro na conversão:', error);
            showStatus(`❌ Erro: ${error.message}`, 'error');
        } finally {
            setButtonState(false);
        }
    }

    // ==================== FUNÇÕES DE CONVERSÃO ====================
    function getFormatInfo(format) {
        if (supportedFormats[format]) {
            return {
                ...supportedFormats[format],
                supported: true,
                fallback: null
            };
        }
        
        if (fallbackFormats[format]) {
            return {
                ...fallbackFormats[format],
                supported: false,
                mime: supportedFormats[fallbackFormats[format].fallback].mime
            };
        }
        
        return {
            name: format.toUpperCase(),
            mime: 'image/png',
            quality: 1.0,
            supported: true,
            fallback: null
        };
    }

    async function convertImageNative(file, formatInfo) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = function() {
                try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve({
                                blob: blob,
                                filename: `converted.${formatInfo.name.toLowerCase()}`,
                                message: `Conversão para ${formatInfo.name} concluída!`
                            });
                        } else {
                            reject(new Error('Falha na conversão'));
                        }
                    }, formatInfo.mime, formatInfo.quality);

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = URL.createObjectURL(file);
        });
    }

    async function convertWithFallback(file, originalFormat, formatInfo) {
        // Converter para o formato fallback
        const fallbackInfo = supportedFormats[formatInfo.fallback];
        const result = await convertImageNative(file, fallbackInfo);
        
        return {
            ...result,
            message: formatInfo.message || `Convertido para ${fallbackInfo.name} (${originalFormat} não suportado)`
        };
    }

    // ==================== FUNÇÕES UTILITÁRIAS ====================
    function formatFileSize(bytes) {
        if (!bytes) return '-';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function showStatus(message, type = 'info') {
        const icons = { success: '✅', error: '❌', loading: '⏳', info: 'ℹ️' };
        
        elements.statusDiv.innerHTML = `${icons[type] || ''} ${message}`;
        elements.statusDiv.className = `status-message status-${type}`;
        elements.statusDiv.style.display = 'block';

        if (type !== 'loading') {
            setTimeout(() => elements.statusDiv.style.display = 'none', 5000);
        }
    }

    function setButtonState(loading) {
        elements.convertBtn.disabled = loading;
        elements.convertBtn.innerHTML = loading ? 
            '<span>Convertendo...</span>' : 
            '<span>Converter Agora</span>';
    }

    function downloadFile(blob, filename) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
            }, 1000);
        });
    }

    function setupDragEffects() {
        elements.dropArea.addEventListener('dragenter', () => {
            elements.dropArea.style.borderColor = '#4CAF50';
            elements.dropArea.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        });

        elements.dropArea.addEventListener('dragleave', () => {
            elements.dropArea.style.borderColor = '#3a7ca5';
            elements.dropArea.style.backgroundColor = 'rgba(30, 58, 95, 0.3)';
        });

        elements.dropArea.addEventListener('drop', () => {
            elements.dropArea.style.borderColor = '#3a7ca5';
            elements.dropArea.style.backgroundColor = 'rgba(30, 58, 95, 0.3)';
        });
    }
});
