$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $repoRoot
try {
  & docker compose -f docker-compose.dev.yml ps
}
finally {
  Pop-Location
}
