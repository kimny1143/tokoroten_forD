import os
import torch
import torch.hub
import soundfile as sf
import numpy as np
import openunmix
import librosa
import audioread
import logging

logger = logging.getLogger(__name__)

def convert_mp3_to_wav(input_mp3, output_wav):
    with audioread.audio_open(input_mp3) as source:
        data = []
        for buffer in source.read_data():
            data.append(np.frombuffer(buffer, dtype='<i2'))
        audio_data = np.concatenate(data)
        audio_data = audio_data.reshape(-1, source.channels)
        sf.write(output_wav, audio_data, source.samplerate, format='WAV', subtype='PCM_16')

def resample_audio(input_file, target_sr=44100):
    data, original_sr = sf.read(input_file, always_2d=True)
    if original_sr != target_sr:
        if data.shape[1] == 1:
            resampled_data = librosa.resample(y=data[:, 0], orig_sr=original_sr, target_sr=target_sr)
        else:
            resampled_data_stereo = [librosa.resample(y=data[:, ch], orig_sr=original_sr, target_sr=target_sr) for ch in range(data.shape[1])]
            resampled_data = np.stack(resampled_data_stereo, axis=-1)
        return resampled_data, target_sr
    else:
        return data, original_sr

def load_audio_file(file_path):
    file_extension = os.path.splitext(file_path)[1].lower()
    try:
        if file_extension == ".mp3":
            temp_wav = os.path.splitext(file_path)[0] + ".wav"
            convert_mp3_to_wav(file_path, temp_wav)
            audio_data, sample_rate = resample_audio(temp_wav)
            os.remove(temp_wav)
        else:
            audio_data, sample_rate = resample_audio(file_path)
            
        if audio_data.ndim == 1:
            audio_data = np.stack([audio_data, audio_data], axis=1)
            
        return audio_data, sample_rate
        
    except Exception as e:
        logger.error(f"Error loading audio file {file_path}: {str(e)}")
        return None, None

def process_audio_file(audio_data, sample_rate, sources, device=None):
    """音声データを処理し、各ソースに分離する"""
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    try:
        # データの形状変換
        audio_data = audio_data.T
        audio_tensor = torch.from_numpy(audio_data).float().to(device)
        audio_tensor = audio_tensor[None, ...]
        
        # モデルの初期化と推論
        separator = torch.hub.load('sigsep/open-unmix-pytorch', 'umxhq', device=device)
        if device.type == 'cuda':
            separator = separator.half()
            
        with torch.no_grad():
            estimates = separator(audio_tensor)
            
        # 分離結果の処理
        separated_sources = {}
        for i, source_name in enumerate(['vocals', 'drums', 'bass', 'other']):
            if source_name in sources:
                source_audio = estimates[0, i, :].detach().cpu().numpy()
                separated_sources[source_name] = source_audio
                
        return separated_sources, sample_rate
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise

def prepare_audio(audio_path):
    """音声データの前処理"""
    try:
        audio_data, sample_rate = load_audio_file(audio_path)
        if audio_data.ndim == 1:
            audio_data = np.stack([audio_data, audio_data], axis=1)
        return audio_data, sample_rate
    except Exception as e:
        raise Exception(f"Error in audio preparation: {str(e)}")

def post_process_audio(separated_audio, output_path, sample_rate=44100):
    """分離後の音声データの後処理とファイル保存"""
    try:
        ensure_directory_exists(os.path.dirname(output_path))
        sf.write(output_path, separated_audio, sample_rate, format='WAV', subtype='PCM_16')
    except Exception as e:
        raise Exception(f"Error in audio post-processing: {str(e)}")

def ensure_directory_exists(directory):
    """出力ディレクトリが存在することを確認"""
    if directory and not os.path.exists(directory):
        os.makedirs(directory)