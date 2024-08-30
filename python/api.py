import sys
import json
import os
import shutil
import numpy as np
import traceback
from audio_processing import process_audio_file

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

def main():
    try:
        data = json.loads(sys.argv[1])
        input_dir = data.get('inputDir')
        output_dir = data.get('outputDir')
        target_base_dir = data.get('targetBaseDir')
        sources = data.get('sources', [])

        if not all([input_dir, output_dir, target_base_dir]):
            raise ValueError("Missing required directory paths")

        ensure_directory_exists(output_dir)
        processing_results = []
        moved_files = []

        for file_name in os.listdir(input_dir):
            if file_name.endswith(('.wav', '.mp3')):
                file_path = os.path.join(input_dir, file_name)
                try:
                    result = process_audio_file(file_path, sources, 'umxhq', 'cpu', output_dir)
                    processing_results.append({"file": file_path, "status": "success", "message": result})
                except Exception as e:
                    processing_results.append({"file": file_path, "status": "error", "message": str(e), "traceback": traceback.format_exc()})

        moved_files.extend(rename_and_move_files(input_dir, target_base_dir))
        moved_files.extend(rename_and_move_files(output_dir, target_base_dir))

        result = {
            "processing_results": processing_results,
            "moved_files": moved_files,
            "overall_status": "success"
        }

    except Exception as e:
        result = {
            "processing_results": [],
            "moved_files": [],
            "overall_status": "error",
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }

    print(json.dumps(result))

if __name__ == "__main__":
    main()