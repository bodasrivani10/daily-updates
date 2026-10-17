import sys
from pathlib import Path
from dulwich.repo import Repo
from dulwich import porcelain

repo_dir = Path(__file__).resolve().parent

def push_to_github(remote_url, branch="main", token=None, username=None):
    repo = Repo(str(repo_dir))
    
    # Format remote URL with token if provided
    push_url = remote_url
    if token and "https://" in remote_url:
        clean_url = remote_url.replace("https://", "")
        if username:
            push_url = f"https://{username}:{token}@{clean_url}"
        else:
            push_url = f"https://{token}@{clean_url}"

    print(f"Pushing current repository to {remote_url} (branch: {branch})...")
    porcelain.push(repo, push_url, f"refs/heads/{branch}")
    print("Push successful!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python push_to_github.py <GITHUB_REPO_URL> [PERSONAL_ACCESS_TOKEN]")
        print("Example: python push_to_github.py https://github.com/myusername/velo-app.git ghp_xxxx")
        sys.exit(1)
        
    url = sys.argv[1]
    pat = sys.argv[2] if len(sys.argv) > 2 else None
    push_to_github(url, token=pat)
