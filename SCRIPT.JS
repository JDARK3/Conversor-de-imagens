const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('uploader');
const fileNameDisplay = document.getElementById('file-name');


//converte e baixa o arquivo 
function convert() {


    const formatSelect = document.getElementById('format');
    const file = fileInput.files[0];
    const format = formatSelect.value;

    if (!file) {
        alert('Selecione uma imagem primeiro!');
        return;
    }

    convertImage(file, format);
}



///Esse escopo mostra o neme da imagem a ser convertida
//Essa função será chamada quando o usuário selecionar uma imagem
function handleImage(event) {
    const file = event.target.files[0];//pega o primeiro arquivo selecionado
    if (file) {
        console.log("Arquivo selecionado:", file.name);
        //// Aqui você vai chamar a função de conversão depois
    }
}
////////////////////-



//Casa com drop-area, pois ele recebe a imagem sem precisar tranferir para outra página
async function convertImage(file, format) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('format', format);

    const response = await fetch('http://localhost:3000/convert', {
        method: 'POST',
        body: formData
    });

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `converted.${format}`;
    link.click();
}



//Permite que eu arraste a imagem para o site

// Impede o comportamento padrão de abrir o arquivo
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Destaca a área quando o arquivo está sobre ela
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.style.borderColor = 'blue';
}

function unhighlight() {
    dropArea.style.borderColor = '#ccc';
}

// Lida com o arquivo solto
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file && file.type.startsWith('image/')) {
        fileInput.files = dt.files;
        fileNameDisplay.textContent = file.name; // Mostra o nome aqui
    } else {
        alert('Por favor, solte apenas arquivos de imagem!');
        fileNameDisplay.textContent = '';
    }
}

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        fileNameDisplay.textContent = e.target.files[0].name;
    } else {
        fileNameDisplay.textContent = '';
    }
});

// Adicione este código para debug
console.log("Script carregado");

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file && file.type.startsWith('image/')) {
        fileInput.files = dt.files;
        fileNameDisplay.textContent = file.name;
    } else {
        alert('Por favor, solte apenas arquivos de imagem!');
        fileNameDisplay.textContent = '';
    }
}
async function convertImage(file, format) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('format', format);

        const response = await fetch('http://localhost:3000/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `converted.${format}`;
        link.click();

    } catch (error) {
        console.error('Erro na conversão:', error);
        alert('Erro ao converter imagem: ' + error.message);
    }
}