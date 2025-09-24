document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Conversor de Imagens JDark - Carregado');

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

    // Estado da aplicação
    let currentFile = null;

    // ==================== INICIALIZAÇÃO ====================
    init();

    async function init() {
        setupEventListeners();
        await checkServerStatus();
        showStatus('✨ Conversor pronto! Selecione uma imagem para começar.', 'info');
    }

    // ==================== CONFIGURAÇÃO DE EVENTOS ====================
    function setupEventListeners() {
        // Eventos principais
        elements.fileInput.addEventListener('change', handleFileSelect);
        elements.convertBtn.addEventListener('click', handleConversion);
        elements.uploadLabel.addEventListener('click', () => elements.fileInput.click());
        
        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, preventDefaults);
            document.body.addEventListener(eventName, preventDefaults);
        });
        
        elements.dropArea.addEventListener('drop', handleFileDrop);
        elements.formatSelect.addEventListener('change', handleFormatChange);

        // Efeitos visuais
        setupDragEffects();
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
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

    async function processFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('❌ Por favor, selecione um arquivo de imagem válido.', 'error');
            return;
        }

        try {
            currentFile = file;
            updateFileInfo(file);
            await showImagePreview(file);
            showStatus('✅ Imagem carregada com sucesso! Clique em "Converter Agora".', 'success');
        } catch (error) {
            showStatus('❌ Erro ao processar a imagem.', 'error');
            console.error('Erro:', error);
        }
    }

    // ==================== ATUALIZAÇÃO DA UI ====================
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
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
        });
    }

    function handleFormatChange() {
        const isIco = elements.formatSelect.value === 'ico';
        elements.icoWarning.style.display = isIco ? 'block' : 'none';
    }

    // ==================== CONVERSÃO PRINCIPAL ====================
    async function handleConversion() {
        if (!currentFile) {
            showStatus('❌ Por favor, selecione uma imagem primeiro.', 'error');
            return;
        }

        const format = elements.formatSelect.value;
        
        showStatus('⏳ Convertendo imagem... Aguarde.', 'loading');
        setButtonState(true);

        try {
            const formData = new FormData();
            formData.append('image', currentFile);
            formData.append('format', format);

            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro: ${response.status}`);
            }

            const blob = await response.blob();
            const filename = `converted_${Date.now()}.${format}`;
            
            await downloadFile(blob, filename);
            
            showStatus(`✅ Conversão concluída! ${filename} baixado.`, 'success');
            trackConversion(format, currentFile.size);

        } catch (error) {
            console.error('Erro na conversão:', error);
            showStatus(`❌ ${error.message}`, 'error');
        } finally {
            setButtonState(false);
        }
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

    async function checkServerStatus() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Servidor:', data.message);
            }
        } catch (error) {
            console.log('❌ Servidor offline');
            showStatus('⚠️ Modo offline limitado. Alguns formatos podem não funcionar.', 'info');
        }
    }

    function trackConversion(format, fileSize) {
        console.log(`📊 Conversão realizada: ${format}, Tamanho: ${fileSize} bytes`);
        // Integrar com Google Analytics aqui posteriormente
    }
});
