import sys
import json
import os
import shutil
import re
import numpy as np
import traceback
from audio_processing import process_audio_file, load_audio_file, post_process_audio
import torch
import librosa
import openunmix
import gc  # ガベージコレクション用に追加

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
    
    # 入力ディレクトリ内のファイルをスキャン
    files = [f for f in os.listdir(input_dir) 
             if os.path.isfile(os.path.join(input_dir, f)) 
             and any(f.lower().endswith(ext) for ext in valid_extensions)]
    
    # 音声処理用のプロセッサを初期化
    processor = AudioProcessor()
    
    for file_name in files:
        if not is_valid_filename(file_name):
            continue
            
        base_name, ext = os.path.splitext(file_name)
        new_base_name = base_name.lstrip('0') + 'X'
        source_path = os.path.join(input_dir, file_name)
        
        if ext.lower() in ['.wav', '.mp3']:
            # 音声ファイルの処理
            audio_data, sample_rate = load_audio_file(source_path)
            if audio_data is None:
                continue
                
            # モデルによる処理
            processor.initialize_model()
            audio_tensor = torch.from_numpy(audio_data.T).float().to(processor.device)
            audio_tensor = audio_tensor[None, ...]
            estimates = processor.process_audio(audio_tensor)  # 更新されたメソッドを使用
            
            # 出力ディレクトリの作成
            ensure_directory_exists(output_dir)
            
            # 結果の保存（新しい命名規則で）
            for i, source_name in enumerate(['vocals', 'drums', 'bass', 'other']):
                if source_name not in sources:
                    continue
                source_audio = estimates[0, i, :].detach().cpu().numpy()
                output_file = os.path.join(output_dir, f"{new_base_name}_{source_name}.wav")
                post_process_audio(source_audio.T, output_file)
                
                processed_files.append({
                    "file": file_name,
                    "output": f"{new_base_name}_{source_name}.wav",
                    "status": "success"
                })
            
            # ファイル処理後のクリーンアップ
            torch.cuda.empty_cache()
            gc.collect()
                
        elif ext.lower() == '.pdf' and enable_rename_move:
            # PDFファイルの処理（リネーム有効時のみ）
            new_file_name = f"{new_base_name}{ext}"
            output_file = os.path.join(output_dir, new_file_name)
            shutil.copy2(source_path, output_file)
            processed_files.append({
                "file": file_name,
                "output": new_file_name,
                "status": "success"
            })
    
    # ファイルの移動（リネーム有効時のみ）
    moved_files = []
    if enable_rename_move:
        for processed_file in processed_files:
            output_file = processed_file["output"]
            source = os.path.join(output_dir, output_file)
            target_dir = os.path.join(target_base_dir, os.path.splitext(output_file)[0].split('_')[0])
            ensure_directory_exists(target_dir)
            target = os.path.join(target_dir, output_file)
            shutil.move(source, target)
            moved_files.append({
                "original": processed_file["file"],
                "new": output_file,
                "target_dir": target_dir
            })
    
    return {
        "processed_files": processed_files,
        "moved_files": moved_files if enable_rename_move else None,
        "input_directory": input_dir,
        "output_directory": output_dir if not enable_rename_move else target_base_dir
    }

class AudioProcessor:
    def __init__(self):
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def initialize_model(self):
        """モデルの初期化を行う"""
        if self.model is None:
            self.model = torch.hub.load('sigsep/open-unmix-pytorch', 'umxhq', device=self.device)
            # GPUの場合、メモリ使用量を削減するために半精度に変換
            if self.device.type == 'cuda':
                self.model = self.model.half()

    def process_audio(self, audio_tensor):
        """音声処理を実行する"""
        with torch.no_grad():  # 勾配計算を無効化してメモリ使用量を削減
            if self.device.type == 'cuda':
                audio_tensor = audio_tensor.half()  # 入力も半精度に変換
            estimates = self.model(audio_tensor)
            # GPUメモリの断片化を防ぐ
            torch.cuda.empty_cache()
            gc.collect()
        return estimates

def main():
    """APIのメインエントリーポイント"""
    while True:
        try:
            command = input().strip()
            if command == "exit":
                break
                
            args = json.loads(command)
            input_path = args['inputDir']
            output_path = args['outputDir']
            target_base_dir = args.get('targetDir', output_path)
            enable_rename_move = args.get('enableRenameMove', False)
            sources = args.get('sources', ['vocals', 'drums', 'bass', 'other'])
            
            result = process_audio_with_management(
                input_path, 
                output_path, 
                target_base_dir,
                sources,
                enable_rename_move
            )
            print(json.dumps({"status": "success", "result": result}))
            sys.stdout.flush()
        except EOFError:
            break
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.stdout.flush()
            
if __name__ == "__main__":
    main()