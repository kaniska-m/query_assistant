from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="defog/sqlcoder-7b-2",
    local_dir="./sqlcoder-7b-2",
    local_dir_use_symlinks=False
)
print("Download complete!")
