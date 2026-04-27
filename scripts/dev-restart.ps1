param(
  [ValidateSet("all", "backend", "frontend", "db")]
  [string]$Service = "backend"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$composeArgs = @("-f", "docker-compose.dev.yml", "restart")

if ($Service -ne "all") {
  $composeArgs += $Service
}

Push-Location $repoRoot
try {
  & docker compose @composeArgs
}
finally {
  Pop-Location
}
