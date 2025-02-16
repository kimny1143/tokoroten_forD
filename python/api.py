import sys
import json
import os
import shutil
import re
import numpy as np
import traceback
from audio_processing import process_audio_file, load_audio_file, post_process_audio
from pdf_markdown import PDFToMarkdownConverter
from markdown_csv import MarkdownToCSVConverter
import torch
import librosa
import openunmix
import gc  # ガベージコレクション用に追加
import soundfile as sf
import logging

logger = logging.getLogger(__name__)

def ensure_directory_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def is_valid_filename(filename):
    """ファイル名が「0から始まる7桁の数値」の形式かチェックする"""
    base_name = os.path.splitext(filename)[0]
    return bool(re.match(r'^0\d{6}$', base_name))

def process_audio_with_management(input_dir, output_dir, target_base_dir, sources, enable_rename_move=False):
    """音源分離とファイル管理を統合して処理する"""
    valid_extensions = ['.wav', '.mp3', '.pdf']
    processed_files = []
    moved_files = []
    
    try:
        # 入力ディレクトリ内のファイルをスキャン
        files = [f for f in os.listdir(input_dir) 
                if os.path.isfile(os.path.join(input_dir, f)) 
                and any(f.lower().endswith(ext) for ext in valid_extensions)]
        
        # 音声処理用のプロセッサを初期化
        processor = AudioProcessor()
        processor.initialize_model()
        
        for file_name in files:
            if not is_valid_filename(file_name):
                continue
                
            base_name, ext = os.path.splitext(file_name)
            new_base_name = base_name.lstrip('0') + 'X'
            source_path = os.path.join(input_dir, file_name)
            
            if ext.lower() in ['.wav', '.mp3']:
                # 音声ファイルの処理
                logger.info(f"Processing audio file: {file_name}")
                audio_data, sample_rate = load_audio_file(source_path)
                if audio_data is None:
                    logger.warning(f"Failed to load audio file: {file_name}")
                    continue
                
                # 音源分離の実行
                separated_sources = processor.process_audio(audio_data, sample_rate, sources)
                
                # 分離した音源の保存
                for source_name, source_data in separated_sources.items():
                    output_filename = f"{new_base_name}_{source_name}{ext}"
                    output_path = os.path.join(output_dir, output_filename)
                    # 音声データが1次元の場合は2次元に変換
                    if source_data.ndim == 1:
                        source_data = source_data.reshape(-1, 1)
                    # 正しいフォーマットで保存
                    sf.write(
                        output_path,
                        source_data.T,  # 転置して保存
                        sample_rate,
                        format='WAV',
                        subtype='PCM_16'
                    )
                    processed_files.append({
                        'file': file_name,
                        'output': output_filename,
                        'type': 'audio'
                    })
                
                # メモリ解放
                del audio_data
                del separated_sources
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    
            elif ext.lower() == '.pdf' and is_valid_filename(file_name):
                # 楽曲番号のPDFファイルの処理（移動のみ）
                new_file_name = f"{new_base_name}{ext}"
                output_path = os.path.join(output_dir, new_file_name)
                shutil.copy2(source_path, output_path)
                processed_files.append({
                    'file': file_name,
                    'output': new_file_name,
                    'type': 'pdf'
                })
        
        # ファイルの移動（enable_rename_moveがTrueの場合）
        if enable_rename_move:
            for processed_file in processed_files:
                output_file = processed_file['output']
                source = os.path.join(output_dir, output_file)
                
                # 移動先ディレクトリ名を取得（拡張子を除いたベース名）
                base_name_without_ext = os.path.splitext(output_file)[0].split('_')[0]
                target_dir = os.path.join(target_base_dir, base_name_without_ext)
                ensure_directory_exists(target_dir)
                
                # 移動先のフルパスを作成
                target = os.path.join(target_dir, output_file)
                
                # ファイルを移動
                shutil.move(source, target)
                moved_files.append({
                    'original': processed_file['file'],
                    'new': output_file,
                    'target_dir': target_dir
                })
        
        return {
            'success': True,
            'input_directory': input_dir,
            'output_directory': output_dir if not enable_rename_move else target_base_dir,
            'processed_files': processed_files,
            'moved_files': moved_files if enable_rename_move else None,
            'message': f'{len(processed_files)}個のファイルを処理しました'
        }
        
    except Exception as e:
        logger.error(f"Error during processing: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'input_directory': input_dir,
            'output_directory': output_dir,
            'processed_files': processed_files,
            'moved_files': moved_files
        }

class AudioProcessor:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None  # モデルの初期化

    def initialize_model(self):
        """モデルの初期化を行う"""
        if self.model is None:
            self.model = torch.hub.load('sigsep/open-unmix-pytorch', 'umxhq', device=self.device)
            # GPUの場合、メモリ使用量を削減するために半精度に変換
            if self.device.type == 'cuda':
                self.model = self.model.half()

    def process_audio(self, audio_data, sample_rate, sources):
        """音声処理を実行する"""
        try:
            # モデルが初期化されていない場合は初期化
            if self.model is None:
                self.initialize_model()
                
            # 音源分離を実行
            separated_sources, _ = process_audio_file(audio_data, sample_rate, sources, self.device)
            return separated_sources
            
        except Exception as e:
            logger.error(f"Error in audio processing: {str(e)}")
            raise

def process_pdf_to_markdown(input_path, output_path, api_key):
    """PDFファイルをMarkdownに変換する"""
    try:
        converter = PDFToMarkdownConverter(api_key=api_key)
        markdown_text = converter.convert_pdf_to_markdown(input_path, output_path)
        return {
            "status": "success",
            "input_file": input_path,
            "output_file": output_path,
            "markdown_text": markdown_text
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "input_file": input_path
        }

def process_markdown_to_csv(input_path, output_dir):
    """Markdownファイルをテーブル形式のCSVに変換する"""
    try:
        converter = MarkdownToCSVConverter()
        csv_paths = converter.convert_markdown_to_csv(input_path, output_dir)
        return {
            "status": "success",
            "input_file": input_path,
            "output_files": csv_paths
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "input_file": input_path
        }

def main():
    try:
        # 標準出力をUTF-8に設定
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)
        
        # 標準入力からJSONデータを読み込む
        input_data = json.loads(sys.stdin.read().strip())
        
        # 必須パラメータの存在確認
        required_params = ['inputDir', 'outputDir', 'targetDir', 'sources']
        if not all(param in input_data for param in required_params):
            raise ValueError("Missing required parameters")
        
        # パラメータの取り出しと型変換
        input_dir = input_data['inputDir']
        output_dir = input_data['outputDir']
        target_dir = input_data['targetDir']
        sources = input_data['sources']
        enable_rename_move = str(input_data.get('enableRenameMove', 'False')).lower() == 'true'
        
        # 音声処理の実行
        result = process_audio_with_management(
            input_dir,
            output_dir,
            target_dir,
            sources,
            enable_rename_move
        )
        
        # 結果をJSON形式で出力（改行を含めない）
        sys.stderr.flush()  # エラー出力をフラッシュ
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
        sys.stdout.flush()
        sys.exit(0)
        
    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        sys.stderr.flush()
        sys.stdout.write(json.dumps(error_output, ensure_ascii=False))
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()