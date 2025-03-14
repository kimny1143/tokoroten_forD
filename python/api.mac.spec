# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None

# カレントディレクトリからの相対パスを使用
libs_dir = os.path.abspath('../libs')
print(f"Looking for libraries in: {libs_dir}")  # デバッグ用

a = Analysis(
    ['api.py'],
    pathex=[],
    binaries=[
        (os.path.join(libs_dir, 'libsox.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr.0.dylib'), '.'),
        (os.path.join(libs_dir, 'libsox.3.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr-lsr.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr-lsr.0.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr.0.1.2.dylib'), '.'),
        (os.path.join(libs_dir, 'libsoxr-lsr.0.1.9.dylib'), '.')
    ],
    datas=[
        ('audio_processing.py', '.'),
        ('pdf_markdown.py', '.'),
        ('markdown_csv.py', '.'),
        ('requirements.txt', '.')
    ],
    hiddenimports=[
        'numpy',
        'torch',
        'torchaudio',
        'librosa',
        'soundfile',
        'numba',
        'scipy',
        'sklearn',
        'anthropic'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'PyQt5', 'tkinter', 'wx', 'PySide2', 'IPython'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
) 