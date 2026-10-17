import sys
from pathlib import Path
from dulwich.repo import Repo
from dulwich import porcelain

repo_dir = Path(__file__).resolve().parent
repo = Repo(str(repo_dir))

porcelain.add(str(repo_dir))
try:
    commit_id = porcelain.commit(
        str(repo_dir),
        message=b"Add persistent cloud PostgreSQL database support and deployment configurations",
        author=b"VELO User <user@velo.local>",
        committer=b"VELO User <user@velo.local>"
    )
    print("New commit created:", commit_id.decode() if isinstance(commit_id, bytes) else commit_id)
except Exception as e:
    print("Nothing new to commit or:", e)
