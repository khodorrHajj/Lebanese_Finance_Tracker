param(
  [switch]$RemoveVolumes
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeArgs = @("-f", "docker-compose.dev.yml", "down")

if ($RemoveVolumes) {
  $composeArgs += "-v"
}

Push-Location $repoRoot
try {
  & docker compose @composeArgs
}
finally {
  Pop-Location
}
