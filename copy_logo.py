import shutil
import os

src = r"C:\Users\Sri Dakshayani\.gemini\antigravity-ide\brain\0285bb5b-e955-4348-9999-ad7db5f6ef65\.user_uploaded\media_1792277223052.png"
dst_dir = r"c:\Users\Sri Dakshayani\Downloads\agent\frontend\public"
dst = os.path.join(dst_dir, "velo_logo.png")

os.makedirs(dst_dir, exist_ok=True)
shutil.copyfile(src, dst)
print("SUCCESSFULLY_COPIED_LOGO")
