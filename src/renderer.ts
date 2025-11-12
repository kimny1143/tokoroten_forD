import { SeparationOptions, AudioProcessingParams, AudioProcessingResult, ConversionResult } from '@/types';

// 状態変数の型定義
let inputDir: string = '';
let outputDir: string = '';
let targetBaseDir: string = '';
let pdfFile: string = '';
let apiKey: string = '';

// タブ切り替え機能
document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // アクティブなタブを更新
        document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // タブコンテンツを切り替え
        const targetId = button.getAttribute('data-tab');
        if (targetId) {
            document.querySelectorAll<HTMLElement>('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        }
    });
});

// 音声処理関連のイベントリスナー
const inputDirButton = document.getElementById('select-input-dir');
const inputDirDisplay = document.getElementById('input-dir') as HTMLInputElement;

inputDirButton?.addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        inputDir = result;
        inputDirDisplay.value = inputDir;
    }
});

const outputDirButton = document.getElementById('select-output-dir');
const outputDirDisplay = document.getElementById('output-dir') as HTMLInputElement;

outputDirButton?.addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        outputDir = result;
        outputDirDisplay.value = outputDir;
    }
});

const targetDirButton = document.getElementById('select-target-dir');
const targetDirDisplay = document.getElementById('target-dir') as HTMLInputElement;

targetDirButton?.addEventListener('click', async () => {
    const result = await window.electronAPI.openDirectory();
    if (result) {
        targetBaseDir = result;
        targetDirDisplay.value = targetBaseDir;
    }
});

interface ProcessedFile {
    file: string;
    output: string;
}

interface MovedFile {
    original: string;
    new: string;
    target_dir: string;
}

interface AudioProcessingResponse {
    result: {
        success: boolean;
        error?: string;
        input_directory?: string;
        output_directory?: string;
        processed_files?: ProcessedFile[];
        moved_files?: MovedFile[];
    };
}

const runAudioButton = document.getElementById('run-audio');
const audioOutput = document.getElementById('audio-output');

runAudioButton?.addEventListener('click', async () => {
    if (!inputDir || !outputDir || !targetBaseDir) {
        alert('Please select all directories first');
        return;
    }

    const sources = ['vocals', 'drums', 'bass', 'other'].filter(source => {
        const checkbox = document.getElementById(source) as HTMLInputElement;
        return checkbox?.checked;
    });

    if (sources.length === 0) {
        alert('Please select at least one source for audio separation');
        return;
    }

    const enableRenameMoveCheckbox = document.getElementById('enable-rename-move') as HTMLInputElement;
    const enableRenameMove = enableRenameMoveCheckbox?.checked || false;

    if (audioOutput) {
        audioOutput.innerHTML = '<p>処理中...</p>';
    }

    try {
        const params: AudioProcessingParams = {
            inputDir,
            outputDir,
            options: {
                vocals: sources.includes('vocals'),
                drums: sources.includes('drums'),
                bass: sources.includes('bass'),
                other: sources.includes('other'),
                enableRenameMove
            }
        };

        const result = await window.electronAPI.processAudio(params);

        if (!result.success) {
            // エラーの場合
            const errorHtml = `
                <h3>エラーが発生しました</h3>
                <p>エラー内容: ${result.error || '不明なエラー'}</p>
                <p>入力ディレクトリ: ${inputDir}</p>
                <p>出力ディレクトリ: ${outputDir}</p>
            `;
            if (audioOutput) {
                audioOutput.innerHTML = errorHtml;
            }
            return;
        }

        // 成功の場合
        let resultHtml = `
            <h3>処理完了</h3>
            <p>入力ディレクトリ: ${inputDir}</p>
            <p>出力ディレクトリ: ${outputDir}</p>
        `;

        if (result.outputFiles && result.outputFiles.length > 0) {
            resultHtml += `
                <h4>処理されたファイル:</h4>
                <ul>
                    ${result.outputFiles.map(file => 
                        `<li>${file}</li>`
                    ).join('')}
                </ul>
            `;
        } else {
            resultHtml += '<p>処理されたファイルはありません</p>';
        }

        if (audioOutput) {
            audioOutput.innerHTML = resultHtml;
        }
    } catch (error) {
        console.error('Processing error:', error);
        if (audioOutput) {
            audioOutput.innerHTML = `
                <h3>エラーが発生しました</h3>
                <p>エラー内容: ${error instanceof Error ? error.message : '不明なエラー'}</p>
            `;
        }
    }
});

// PDF/CSV変換関連のイベントリスナー
const selectPdfButton = document.getElementById('select-pdf-file');
const pdfFileDisplay = document.getElementById('pdf-file') as HTMLInputElement;
const convertToMarkdownButton = document.getElementById('convert-to-markdown') as HTMLButtonElement;

selectPdfButton?.addEventListener('click', async () => {
    const result = await window.electronAPI.openPDFFile();
    if (result) {
        pdfFile = result;
        pdfFileDisplay.value = pdfFile;
        // PDFファイルが選択されたらMarkdown変換ボタンを有効化
        if (convertToMarkdownButton) {
            convertToMarkdownButton.disabled = false;
        }
    }
});

const saveApiKeyButton = document.getElementById('save-api-key');
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;

saveApiKeyButton?.addEventListener('click', async () => {
    const inputKey = apiKeyInput.value.trim();
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

const conversionOutput = document.getElementById('conversion-output');
const previewContent = document.querySelector<HTMLElement>('.preview-content');

convertToMarkdownButton?.addEventListener('click', async () => {
    if (!pdfFile) {
        alert('PDFファイルを選択してください');
        return;
    }

    if (conversionOutput) {
        conversionOutput.innerHTML = '<p>変換中...</p>';
    }
    
    try {
        const result = await window.electronAPI.convertPdfToMarkdown(pdfFile);

        if (result.success && previewContent && conversionOutput) {
            // プレビューエリアにMarkdownを表示
            previewContent.textContent = result.markdown_text || '';
            conversionOutput.innerHTML = '<p>変換が完了しました</p>';
            // Markdown→CSVボタンを有効化
            const convertToCsvButton = document.getElementById('convert-to-csv') as HTMLButtonElement;
            if (convertToCsvButton) {
                convertToCsvButton.disabled = false;
            }
        } else if (conversionOutput) {
            conversionOutput.innerHTML = `<p>Error: ${result.error || '変換に失敗しました'}</p>`;
        }
    } catch (error) {
        console.error('Conversion error:', error);
        if (conversionOutput) {
            conversionOutput.innerHTML = `<p>Error: ${error instanceof Error ? error.message : '変換に失敗しました'}</p>`;
        }
    }
});

const convertToCsvButton = document.getElementById('convert-to-csv');

convertToCsvButton?.addEventListener('click', async () => {
    if (conversionOutput) {
        conversionOutput.innerHTML = '<p>CSV変換中...</p>';
    }
    
    try {
        const markdownPath = pdfFile.replace('.pdf', '.md');
        const result = await window.electronAPI.convertMarkdownToCsv({
            markdownContent: markdownPath,
            outputDir: null
        });

        if (result.success && conversionOutput) {
            conversionOutput.innerHTML = `
                <p>CSV変換が完了しました</p>
                <p>出力ファイル: ${result.csvPaths?.join(', ') || ''}</p>
            `;
        } else if (conversionOutput) {
            conversionOutput.innerHTML = `<p>Error: ${result.error || 'CSV変換に失敗しました'}</p>`;
        }
    } catch (error) {
        console.error('CSV conversion error:', error);
        if (conversionOutput) {
            conversionOutput.innerHTML = `<p>Error: ${error instanceof Error ? error.message : 'CSV変換に失敗しました'}</p>`;
        }
    }
});

// テーマ切り替え機能
let isDarkMode = false;
const themeToggleButton = document.getElementById('theme-toggle');

themeToggleButton?.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
}); 