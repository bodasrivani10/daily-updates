import os
import sys
from pathlib import Path
from dulwich.repo import Repo
from dulwich import porcelain

repo_dir = Path(__file__).resolve().parent

try:
    if not (repo_dir / ".git").exists():
        repo = Repo.init(str(repo_dir))
        print("Initialized empty Git repository at", repo_dir)
    else:
        repo = Repo(str(repo_dir))
        print("Existing Git repository found at", repo_dir)

    # Stage files obeying .gitignore
    porcelain.add(str(repo_dir))
    print("Staged files.")

    # Commit
    commit_id = porcelain.commit(
        str(repo_dir),
        message=b"Initial commit: VELO AI Workspace with Employee/Manager Dashboards and Multi-channel integrations",
        author=b"VELO User <user@velo.local>",
        committer=b"VELO User <user@velo.local>"
    )
    print("Created initial commit:", commit_id.decode() if isinstance(commit_id, bytes) else commit_id)

except Exception as e:
    print("Error:", e, file=sys.stderr)
    sys.exit(1)
