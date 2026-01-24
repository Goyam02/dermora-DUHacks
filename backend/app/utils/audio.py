import subprocess
import uuid
import os


def normalize_audio_for_azure(input_path: str) -> str:
    output_path = f"/tmp/{uuid.uuid4()}.wav"

    command = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",   # 👈 IMPORTANT (explicit codec)
        output_path,
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed:\n{result.stderr.decode()}"
        )

    # 🔴 HARD CHECKS (do not skip)
    if not os.path.exists(output_path):
        raise RuntimeError("Normalized audio file not created")

    if os.path.getsize(output_path) < 1024:
        raise RuntimeError("Normalized audio file is empty or too small")

    return output_path
