param(
  [switch]$Build,
  [switch]$Attach
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsDir = Join-Path $repoRoot "logs"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$composeArgs = @("-f", "docker-compose.dev.yml", "up")

if ($Build) {
  $composeArgs += "--build"
}

if (-not $Attach) {
  $composeArgs += "-d"
}

Push-Location $repoRoot
try {
  & docker compose @composeArgs
}
finally {
  Pop-Location
}
