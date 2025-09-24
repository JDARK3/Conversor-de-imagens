document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Script carregado');

    // Elementos do DOM
    const fileInput = document.getElementById('uploader');
    const fileName = document.getElementById('file-name');
    const fileType = document.getElementById('file-type');
    const fileSize = document.getElementById('file-size');
    const convertBtn = document.getElementById('convert-btn');
    const formatSelect = document.getElementById('format');
    const statusDiv = document.getElementById('status');
    const imagePreview = document.getElementById('image-preview');
    const uploadLabel = document.querySelector('.custom-file-upload');

    // Verificar se servidor está online
    checkServerStatus();

    // Funções de utilidade
    function formatFileSize(bytes) {
        if (!bytes) return '-';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = '';
        statusDiv.classList.add(`status-${type}`);
        statusDiv.style.display = 'block';

        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    async function checkServerStatus() {
        try {
            const response = await fetch('/health');
            if (response.ok) {
                console.log('✅ Servidor online');
                showStatus('Servidor conectado!', 'success');
            }
        } catch (error) {
            console.log('❌ Servidor offline');
            showStatus('ERRO: Servidor offline. Execute: node server.js', 'error');
        }
    }

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', convertImage);
    uploadLabel.addEventListener('click', () => fileInput.click());

    // Handlers
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            updateFileInfo(file);
            showImagePreview(file);
            showStatus('Imagem carregada! Clique em Converter.', 'success');
        } else {
            showStatus('Selecione uma imagem válida!', 'error');
        }
    }

    function updateFileInfo(file) {
        fileName.textContent = file.name;
        fileType.textContent = file.type;
        fileSize.textContent = formatFileSize(file.size);
    }

    function showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                <p style="margin-top: 10px; color: #7fdbda;">Pré-visualização:</p>
            `;
        };
        reader.readAsDataURL(file);
    }

    async function convertImage() {
        const file = fileInput.files[0];
        const format = formatSelect.value;

        if (!file) {
            showStatus('Selecione uma imagem primeiro!', 'error');
            return;
        }

        showStatus('Convertendo...', 'loading');
        convertBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('format', format);

            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `converted.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            showStatus('✅ Download iniciado!', 'success');

        } catch (error) {
            console.error('Erro:', error);
            showStatus('❌ Erro: ' + error.message, 'error');
        } finally {
            convertBtn.disabled = false;
        }
    }

    const dropArea = document.getElementById('drop-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => e.preventDefault());
        document.body.addEventListener(eventName, e => e.preventDefault());
    });

    dropArea.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            fileInput.files = e.dataTransfer.files; // faz o input "pegar" o arquivo arrastado
            updateFileInfo(file);
            showImagePreview(file);
            showStatus('Imagem carregada via arrastar!', 'success');
        } else {
            showStatus('Arquivo inválido! Selecione uma imagem.', 'error');
        }
    });


});