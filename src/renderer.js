let inputDir = '';
let outputDir = '';
let targetBaseDir = '';
let pdfFile = '';
let apiKey = '';

// タブ切り替え機能
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // アクティブなタブを更新
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // タブコンテンツを切り替え
        const targetId = button.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
    });
});

// 音声処理関連のイベントリスナー
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

document.getElementById('run-audio').addEventListener('click', async () => {
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
    document.getElementById('audio-output').innerHTML = '<p>処理中...</p>';

    try {
        const result = await window.electronAPI.processAudio({ 
            inputDir, 
            outputDir, 
            targetDir: targetBaseDir,
            sources,
            enableRenameMove
        });

        if (!result.result.success) {
            // エラーの場合
            let errorHtml = `
                <h3>エラーが発生しました</h3>
                <p>エラー内容: ${result.result.error}</p>
                <p>入力ディレクトリ: ${result.result.input_directory}</p>
                <p>出力ディレクトリ: ${result.result.output_directory}</p>
            `;
            document.getElementById('audio-output').innerHTML = errorHtml;
            return;
        }

        // 成功の場合
        let resultHtml = `
            <h3>処理完了</h3>
            <p>入力ディレクトリ: ${result.result.input_directory}</p>
            <p>出力ディレクトリ: ${result.result.output_directory}</p>
        `;

        if (result.result.processed_files && result.result.processed_files.length > 0) {
            resultHtml += `
                <h4>処理されたファイル:</h4>
                <ul>
                    ${result.result.processed_files.map(file => 
                        `<li>${file.file} → ${file.output}</li>`
                    ).join('')}
                </ul>
            `;
        } else {
            resultHtml += '<p>処理されたファイルはありません</p>';
        }

        if (enableRenameMove && result.result.moved_files && result.result.moved_files.length > 0) {
            resultHtml += `
                <h4>移動されたファイル:</h4>
                <ul>
                    ${result.result.moved_files.map(file => 
                        `<li>${file.original} → ${file.new} (移動先: ${file.target_dir})</li>`
                    ).join('')}
                </ul>
            `;
        }

        document.getElementById('audio-output').innerHTML = resultHtml;
    } catch (error) {
        console.error('Processing error:', error);
        document.getElementById('audio-output').innerHTML = `
            <h3>エラーが発生しました</h3>
            <p>エラー内容: ${error.message}</p>
        `;
    }
});

// PDF/CSV変換関連のイベントリスナー
document.getElementById('select-pdf-file').addEventListener('click', async () => {
    const result = await window.electronAPI.openPDFFile();
    if (result) {
        pdfFile = result;
        document.getElementById('pdf-file').value = pdfFile;
        // PDFファイルが選択されたらMarkdown変換ボタンを有効化
        document.getElementById('convert-to-markdown').disabled = false;
    }
});

document.getElementById('save-api-key').addEventListener('click', async () => {
    const inputKey = document.getElementById('api-key').value.trim();
    if (inputKey) {
        try {
            await window.electronAPI.saveAPIKey(inputKey);
            apiKey = inputKey;
            alert('APIキーを保存しました');
        } catch (error) {
            console.error('API key save error:', error);
            alert('APIキーの保存に失敗しました');
        }
    }
});

document.getElementById('convert-to-markdown').addEventListener('click', async () => {
    if (!pdfFile) {
        alert('PDFファイルを選択してください');
        return;
    }

    const outputArea = document.getElementById('conversion-output');
    const previewContent = document.querySelector('.preview-content');
    outputArea.innerHTML = '<p>変換中...</p>';
    
    try {
        const result = await window.electronAPI.convertPDFToMarkdown({
            pdfPath: pdfFile,
            apiKey: apiKey
        });

        if (result.success) {
            // プレビューエリアにMarkdownを表示
            previewContent.textContent = result.markdown;
            outputArea.innerHTML = '<p>変換が完了しました</p>';
            // Markdown→CSVボタンを有効化
            document.getElementById('convert-to-csv').disabled = false;
        } else {
            outputArea.innerHTML = `<p>Error: ${result.error}</p>`;
        }
    } catch (error) {
        console.error('Conversion error:', error);
        outputArea.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

document.getElementById('convert-to-csv').addEventListener('click', async () => {
    const outputArea = document.getElementById('conversion-output');
    outputArea.innerHTML = '<p>CSV変換中...</p>';
    
    try {
        const result = await window.electronAPI.convertMarkdownToCSV({
            markdownPath: pdfFile.replace('.pdf', '.md')
        });

        if (result.success) {
            outputArea.innerHTML = `
                <p>CSV変換が完了しました</p>
                <p>出力ファイル: ${result.csvPath}</p>
            `;
        } else {
            outputArea.innerHTML = `<p>Error: ${result.error}</p>`;
        }
    } catch (error) {
        console.error('CSV conversion error:', error);
        outputArea.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// テーマ切り替え機能
let isDarkMode = false;
document.getElementById('theme-toggle').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
});