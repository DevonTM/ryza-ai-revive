#!/usr/bin/env python3
"""Build a Ryza reference audio sample for voice cloning.

Combines web/assets/voice/ryza_wav/prologue_01.wav, prologue_02.wav, and prologue_03.wav with:
  - 50ms silence before start
  - 100ms silence between clips
  - 100ms silence at the end

Transcript:
  これは、ライザの夢の世界。あなたと作る、一夏の物語。この世界の主人公はあなた。決まった道も世界もなくて、あなたの言葉がそのまま物語になるの。

Uses only the Python standard library `wave` module (zero third-party dependencies).

Output:
  web/assets/voice/ryza_clone_reference.wav
"""
import os
import sys
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "web", "assets", "voice", "ryza_wav")
OUT_PATH = os.path.join(ROOT, "web", "assets", "voice", "ryza_clone_reference.wav")

CLIPS = [
    "prologue_01.wav",
    "prologue_02.wav",
    "prologue_03.wav",
]

START_SILENCE_MS = 50
GAP_SILENCE_MS = 100
END_SILENCE_MS = 100


def main():
    missing = [c for c in CLIPS if not os.path.isfile(os.path.join(SRC_DIR, c))]
    if missing:
        sys.stderr.write("Missing input clips: %s\n" % ", ".join(missing))
        sys.exit(1)

    audio_chunks = []
    first_path = os.path.join(SRC_DIR, CLIPS[0])
    with wave.open(first_path, "rb") as w:
        sample_rate = w.getframerate()
        channels = w.getnchannels()
        sampwidth = w.getsampwidth()

    for fn in CLIPS:
        p = os.path.join(SRC_DIR, fn)
        with wave.open(p, "rb") as w:
            sr = w.getframerate()
            ch = w.getnchannels()
            sw = w.getsampwidth()
            nframes = w.getnframes()
            data = w.readframes(nframes)
            assert (sr, ch, sw) == (sample_rate, channels, sampwidth), (
                "Audio format mismatch in %s" % fn
            )
            audio_chunks.append((nframes, data))

    bytes_per_frame = channels * sampwidth

    start_pause_frames = int(round((START_SILENCE_MS / 1000.0) * sample_rate))
    gap_pause_frames = int(round((GAP_SILENCE_MS / 1000.0) * sample_rate))
    end_pause_frames = int(round((END_SILENCE_MS / 1000.0) * sample_rate))

    start_silent_block = b"\x00" * (bytes_per_frame * start_pause_frames)
    gap_silent_block = b"\x00" * (bytes_per_frame * gap_pause_frames)
    end_silent_block = b"\x00" * (bytes_per_frame * end_pause_frames)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with wave.open(OUT_PATH, "wb") as out:
        out.setnchannels(channels)
        out.setsampwidth(sampwidth)
        out.setframerate(sample_rate)

        # 50ms silence at start
        out.writeframes(start_silent_block)

        for i, (nframes, data) in enumerate(audio_chunks):
            out.writeframes(data)
            if i < len(audio_chunks) - 1:
                # 100ms silence gap between clips
                out.writeframes(gap_silent_block)

        # 100ms silence at end
        out.writeframes(end_silent_block)

    with wave.open(OUT_PATH, "rb") as check:
        final_frames = check.getnframes()
        final_sr = check.getframerate()
        final_dur = final_frames / final_sr

    expected_frames = (
        start_pause_frames
        + sum(n for n, _ in audio_chunks)
        + gap_pause_frames * (len(audio_chunks) - 1)
        + end_pause_frames
    )
    assert final_frames == expected_frames, (
        "Frame count mismatch: %d != %d" % (final_frames, expected_frames)
    )

    print("Generated %s" % OUT_PATH)
    print("  Duration: %.3fs (%d frames at %d Hz)" % (final_dur, final_frames, final_sr))
    print("  Structure: 50ms silence + prologue_01 (%.3fs) + 100ms silence + prologue_02 (%.3fs) + 100ms silence + prologue_03 (%.3fs) + 100ms silence"
          % (audio_chunks[0][0] / sample_rate, audio_chunks[1][0] / sample_rate, audio_chunks[2][0] / sample_rate))


if __name__ == "__main__":
    main()
