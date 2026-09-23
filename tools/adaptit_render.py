from pathlib import Path
import subprocess, requests, numpy as np, soundfile as sf, os, sys

ROOT = Path("adaptit_render")
ROOT.mkdir(exist_ok=True)

NARRATION = """Healthcare has never had more technology. Yet inside many hospitals, critical information is still fragmented across systems, departments and providers.

AdaptIT was built to change that.

At the centre is the patient, securely connected to physicians, nurses, diagnostics, pharmacy, administration and hospital operations through one unified healthcare ecosystem.

From intake and clinical documentation to scheduling, diagnostics, discharge and bed utilization, AdaptIT is designed to reduce friction, improve the use of practitioner time and help hospitals move patients through care more intelligently.

AdaptIT connects with existing infrastructure and healthcare devices, allowing hospitals to modernize without abandoning the systems they already rely on.

At the intelligence layer is AdaptIT's Clinical Prediction Engine. Artificial intelligence can cross-reference relevant clinical information against medical knowledge, published research and clinical protocols, not to replace the physician, but to provide greater perspective when critical decisions are being made.

And the opportunity is substantial. The global digital-health market is estimated at approximately four hundred twenty billion dollars in 2026. One percent represents roughly four point two billion dollars in annual market value. Five percent represents more than twenty-one billion dollars. Those figures illustrate market scale, not a revenue forecast.

AdaptIT is designed to scale from one hospital, to regional networks, to connected national healthcare infrastructure.

Technology should not make healthcare more complicated. It should make it more connected, more efficient, more intelligent, and more human.

AdaptIT. One patient. One connected healthcare ecosystem."""

def run(cmd):
    print("+", " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(x) for x in cmd], check=True)

# Neural narration (Apache-licensed Kokoro)
from kokoro import KPipeline
pipeline = KPipeline(lang_code='a')
parts = []
for result in pipeline(NARRATION, voice='am_onyx', speed=1.03):
    audio = getattr(result, "audio", None)
    if audio is None:
        try:
            audio = result[2]
        except Exception:
            continue
    if hasattr(audio, "cpu"):
        audio = audio.cpu().numpy()
    parts.append(np.asarray(audio))
if not parts:
    raise RuntimeError("Kokoro produced no audio")
voice = np.concatenate(parts)
sf.write(ROOT/"narration.wav", voice, 24000)

def duration(path):
    out = subprocess.check_output([
        "ffprobe","-v","error","-show_entries","format=duration",
        "-of","default=noprint_wrappers=1:nokey=1",str(path)
    ], text=True).strip()
    return float(out)

voice_dur = duration(ROOT/"narration.wav")
print("Narration duration:", voice_dur)

# Modern moving healthcare footage. Pexels free stock video.
clips = [
("doctor_computer","https://videos.pexels.com/video-files/6997946/6997946-hd_1920_1080_25fps.mp4"),
("doctors_tablet","https://videos.pexels.com/video-files/5453568/5453568-uhd_3840_2160_25fps.mp4"),
("doctor_patient_tablet","https://videos.pexels.com/video-files/6010949/6010949-uhd_3840_2160_25fps.mp4"),
("mri","https://videos.pexels.com/video-files/7088517/7088517-uhd_3840_2160_25fps.mp4"),
("mri_operator","https://videos.pexels.com/video-files/7088469/7088469-uhd_3840_2160_25fps.mp4"),
("pharmacy","https://videos.pexels.com/video-files/8657324/8657324-uhd_4096_2160_25fps.mp4"),
("hospital_room","https://videos.pexels.com/video-files/5203512/5203512-hd_1920_1080_30fps.mp4"),
("operating_room","https://videos.pexels.com/video-files/3197634/3197634-hd_1920_1080_25fps.mp4"),
("radiology","https://videos.pexels.com/video-files/6236753/6236753-uhd_3840_2160_25fps.mp4"),
("patient_journey","https://videos.pexels.com/video-files/6997942/6997942-hd_1920_1080_25fps.mp4"),
("server","https://videos.pexels.com/video-files/5028622/5028622-uhd_3840_2160_25fps.mp4"),
("data","https://videos.pexels.com/video-files/7140928/7140928-uhd_3840_2160_24fps.mp4"),
("hospital_exterior","https://videos.pexels.com/video-files/34261641/14516997_1920_1080_30fps.mp4"),
("hospital_aerial","https://videos.pexels.com/video-files/34261637/14516983_1920_1080_30fps.mp4"),
]

headers={"User-Agent":"Mozilla/5.0"}
downloaded=[]
for name,url in clips:
    path=ROOT/f"{name}.mp4"
    if not path.exists():
        print("Downloading", name, flush=True)
        with requests.get(url, headers=headers, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(path,"wb") as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk: f.write(chunk)
    downloaded.append(path)

# Narrative-matched sequence: fragmented systems -> connected care -> workflows ->
# interoperability -> AI decision support -> market/scale -> human close.
order = [0,10,1,2,5,6,9,7,3,8,10,11,8,1,13,12,2,9,13,12]
seg_len = 6.0
segments=[]
vf = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,eq=contrast=1.055:saturation=0.92:brightness=-0.018"
for i,src_idx in enumerate(order):
    src=downloaded[src_idx]
    out=ROOT/f"seg_{i:02d}.mp4"
    start = (i % 3) * 1.5
    run([
        "ffmpeg","-y","-hide_banner","-loglevel","error",
        "-stream_loop","-1","-ss",f"{start:.2f}","-i",src,
        "-t",str(seg_len),"-an","-vf",vf,
        "-c:v","libx264","-preset","veryfast","-crf","20",
        "-pix_fmt","yuv420p","-r","30",out
    ])
    segments.append(out)

concat=ROOT/"concat.txt"
concat.write_text("".join(f"file '{p.resolve()}'\n" for p in segments))
run(["ffmpeg","-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i",concat,
     "-c","copy",ROOT/"visual_base.mp4"])

# Premium restrained text overlays over moving video.
D = voice_dur
font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
regular="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
market_start=max(0,D*0.67)
market_1=max(0,D*0.74)
market_5=max(0,D*0.81)
ai_start=max(0,D*0.48)
final_start=max(0,D-8.5)

def dt(text, start, end, size, y, fontfile=font, box=True):
    safe=text.replace("\\","\\\\").replace(":","\\:").replace("'","\\'")
    base=f"drawtext=fontfile={fontfile}:text='{safe}':expansion=none:fontsize={size}:fontcolor=white:x=(w-text_w)/2:y={y}:enable='between(t,{start:.2f},{end:.2f})'"
    if box:
        base += ":box=1:boxcolor=black@0.38:boxborderw=22"
    return base

filters=[
    dt("ADAPTIT",0.6,min(4.8,D),78,"h*0.73"),
    dt("ONE PATIENT  |  ONE CONNECTED ECOSYSTEM",D*0.12,D*0.21,46,"h*0.78"),
    dt("CLINICAL PREDICTION ENGINE",ai_start,ai_start+7.5,50,"h*0.76"),
    dt("GLOBAL DIGITAL HEALTH  |  ~420B USD  |  2026",market_start,market_start+7.5,48,"h*0.72"),
    dt("1 PERCENT  |  ~4.2B MARKET VALUE",market_1,market_1+6.5,50,"h*0.72"),
    dt("5 PERCENT  |  >21B MARKET VALUE",market_5,market_5+6.5,50,"h*0.72"),
    dt("Illustrative market scale - not a revenue forecast",market_1,market_5+7.0,27,"h*0.86",regular,True),
    dt("ADAPTIT",final_start,D,74,"h*0.64"),
    dt("One patient. One connected healthcare ecosystem.",final_start,D,36,"h*0.76",regular,False),
]
filterchain=",".join(filters)
run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",ROOT/"visual_base.mp4",
     "-vf",filterchain,"-an","-c:v","libx264","-preset","veryfast","-crf","19",
     "-pix_fmt","yuv420p",ROOT/"visual_text.mp4"])

# Minimal cinematic ambient bed synthesized locally, so no music licensing dependency.
music_dur=max(120.0,D+2.0)
run([
    "ffmpeg","-y","-hide_banner","-loglevel","error",
    "-f","lavfi","-i",f"sine=frequency=110:sample_rate=48000:duration={music_dur}",
    "-f","lavfi","-i",f"sine=frequency=164.81:sample_rate=48000:duration={music_dur}",
    "-f","lavfi","-i",f"sine=frequency=220:sample_rate=48000:duration={music_dur}",
    "-f","lavfi","-i",f"anoisesrc=color=pink:sample_rate=48000:duration={music_dur}:amplitude=0.015",
    "-filter_complex",
    f"[0:a]volume=0.020[a0];[1:a]volume=0.012[a1];[2:a]volume=0.008[a2];[3:a]lowpass=f=900,volume=0.12[a3];[a0][a1][a2][a3]amix=inputs=4:normalize=0,afade=t=in:st=0:d=3,afade=t=out:st={max(0,music_dur-5):.2f}:d=5[m]",
    "-map","[m]","-c:a","pcm_s16le",ROOT/"music.wav"
])

# Final mix and fast-start MP4.
run([
    "ffmpeg","-y","-hide_banner","-loglevel","error",
    "-i",ROOT/"visual_text.mp4","-i",ROOT/"narration.wav","-i",ROOT/"music.wav",
    "-filter_complex","[1:a]volume=1.0[n];[2:a]volume=0.16[m];[n][m]amix=inputs=2:duration=first:dropout_transition=2[a]",
    "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k",
    "-shortest","-movflags","+faststart","adaptit-investor.mp4"
])

final_dur=duration("adaptit-investor.mp4")
size=os.path.getsize("adaptit-investor.mp4")
print(f"FINAL_DURATION={final_dur:.2f}")
print(f"FINAL_SIZE={size}")
if not (80 <= final_dur <= 120):
    print("WARNING: runtime outside desired 90-110s band", file=sys.stderr)
