import sys
import json
import os
import shutil
import numpy as np
import traceback
from audio_processing import process_audio_file, load_audio_file, post_process_audio
import torch
import librosa
import openunmix

def ensure_directory_exists(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def rename_and_move_files(source_dir, target_base_dir):
    valid_extensions = ['.wav', '.mp3', '.pdf']
    files = [f for f in os.listdir(source_dir) if os.path.isfile(os.path.join(source_dir, f)) and any(f.endswith(ext) for ext in valid_extensions)]
    
    moved_files = []
    for file_name in files:
        base_name, ext = os.path.splitext(file_name)
        new_base_name = base_name
        if base_name.count('X') < 2 and base_name.startswith('0'):
            new_base_name = base_name.lstrip('0') + 'X'
            new_file_name = new_base_name + ext
        elif base_name.count('X') == 1:
            new_file_name = file_name
        else:
            continue
        
        song_number = ''.join([char for char in new_base_name if char.isdigit() or char == 'X'])
        target_dir = os.path.join(target_base_dir, song_number)
        ensure_directory_exists(target_dir)

        source_path = os.path.join(source_dir, file_name)
        target_path = os.path.join(target_dir, new_file_name)
        shutil.move(source_path, target_path)
        moved_files.append({"original": file_name, "new": new_file_name, "target_dir": target_dir})
    
    return moved_files

class AudioProcessor:
    def __init__(self):
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def initialize_model(self):
        """モデルの初期化を行う"""
        if self.model is None:
            self.model = openunmix.OpenUnmix()
            self.model.to(self.device)
            
    def process_audio(self, input_path, output_path):
        """音源分離の実行"""
        self.initialize_model()
        
        # 音声ファイルの読み込みと前処理
        audio_data, sample_rate = load_audio_file(input_path)
        if audio_data is None:
            raise Exception(f"Error loading audio file {input_path}")
        
        # モデルによる処理
        audio_tensor = torch.from_numpy(audio_data.T).float().to(self.device)
        audio_tensor = audio_tensor[None, ...]
        estimates = self.model(audio_tensor)
        
        # 結果の保存
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        for i, source_name in enumerate(['vocals', 'drums', 'bass', 'other']):
            source_audio = estimates[0, i, :].detach().cpu().numpy()
            output_file = os.path.join(output_path, f"{base_name}_{source_name}.wav")
            post_process_audio(source_audio.T, output_file)
            
        return {
            "status": "success",
            "input_file": input_path,
            "output_directory": output_path
        }

def main():
    """APIのメインエントリーポイント"""
    processor = AudioProcessor()
    
    while True:
        command = input().strip()
        if command == "exit":
            break
            
        try:
            args = json.loads(command)
            result = processor.process_audio(args['input'], args['output'])
            print(json.dumps({"status": "success", "result": result}))
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()