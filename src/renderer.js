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
    const sources = ['vocals', 'drums', 'bass', 'other'].filter(source => 
        document.getElementById(source).checked
    );

    if (!inputDir || !outputDir || !targetBaseDir) {
        alert('Please select all directories first');
        return;
    }

    if (sources.length === 0) {
        alert('Please select at least one source');
        return;
    }

    document.getElementById('output').innerHTML = '<p>Processing...</p>';

    try {
        const result = await window.electronAPI.processAudio({ inputDir, outputDir, targetBaseDir, sources });
        document.getElementById('output').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    } catch (error) {
        document.getElementById('output').innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// Theme toggle functionality
let isDarkMode = false;
document.getElementById('theme-toggle').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
});