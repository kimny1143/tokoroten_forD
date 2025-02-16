let inputDir = '';
let outputDir = '';
let targetBaseDir = '';

document.getElementById('select-input-dir').addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        inputDir = result;
        document.getElementById('input-dir').value = inputDir;
    }
});

document.getElementById('select-output-dir').addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        outputDir = result;
        document.getElementById('output-dir').value = outputDir;
    }
});

document.getElementById('select-target-dir').addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        targetBaseDir = result;
        document.getElementById('target-dir').value = targetBaseDir;
    }
});

document.getElementById('run').addEventListener('click', async () => {
    if (!inputDir || !outputDir || !targetBaseDir) {
        alert('Please select all directories first');
        return;
    }

    const sources = ['vocals', 'drums', 'bass', 'other'].filter(source => 
        document.getElementById(source).checked
    );

    if (sources.length === 0) {
        alert('Please select at least one source for audio separation');
        return;
    }

    const enableRenameMove = document.getElementById('enable-rename-move').checked;
    document.getElementById('output').innerHTML = '<p>Processing...</p>';

    try {
        const result = await window.electronAPI.processAudio({ 
            inputDir, 
            outputDir, 
            targetDir: targetBaseDir,
            sources,
            enableRenameMove
        });

        let resultHtml = `
            <h3>処理完了</h3>
            <p>入力ディレクトリ: ${result.result.input_directory}</p>
            <p>出力ディレクトリ: ${result.result.output_directory}</p>
            <h4>処理されたファイル:</h4>
            <ul>
                ${result.result.processed_files.map(file => 
                    `<li>${file.file} → ${file.output}</li>`
                ).join('')}
            </ul>
        `;

        if (enableRenameMove && result.result.moved_files) {
            resultHtml += `
                <h4>移動されたファイル:</h4>
                <ul>
                    ${result.result.moved_files.map(file => 
                        `<li>${file.original} → ${file.new} (移動先: ${file.target_dir})</li>`
                    ).join('')}
                </ul>
            `;
        }

        document.getElementById('output').innerHTML = resultHtml;
    } catch (error) {
        console.error('Processing error:', error);
        document.getElementById('output').innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// Theme toggle functionality
let isDarkMode = false;
document.getElementById('theme-toggle').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
});