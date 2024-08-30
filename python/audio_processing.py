import os
import torch
import torch.hub
import soundfile as sf
import numpy as np
import openunmix
import librosa
import audioread

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
            resampled_data = librosa.resample(data[:, 0], orig_sr=original_sr, target_sr=target_sr)
        else:
            resampled_data_stereo = [librosa.resample(data[:, ch], orig_sr=original_sr, target_sr=target_sr) for ch in range(data.shape[1])]
            resampled_data = np.stack(resampled_data_stereo, axis=-1)
        return resampled_data, target_sr
    else:
        return data, original_sr

def load_audio_file(file_path):
    file_extension = os.path.splitext(file_path)[1].lower()
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

def process_audio_file(file_path, sources, model, device, output_dir):
    audio_data, sample_rate = load_audio_file(file_path)
    if audio_data is None:
        raise Exception(f"Error loading audio file {file_path}")
    
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    ext = os.path.splitext(file_path)[1]

    if base_name.startswith('0'):
        base_name = base_name.lstrip('0')

    if 'X' not in base_name:
        base_name += 'X'

    audio_data = audio_data.T
    audio_tensor = torch.from_numpy(audio_data).float().to(device)
    audio_tensor = audio_tensor[None, ...]
    separator = torch.hub.load('sigsep/open-unmix-pytorch', model, device=device)
    estimates = separator(audio_tensor)

    for i, source_name in enumerate(['vocals', 'drums', 'bass', 'other']):
        if source_name in sources:
            source_audio = estimates[0, i, :].detach().cpu().numpy()
            output_filename = f"{base_name}_{source_name}{ext}"
            output_path = os.path.join(output_dir, output_filename)
            sf.write(output_path, source_audio.T, sample_rate)

    return "Processing completed successfully"