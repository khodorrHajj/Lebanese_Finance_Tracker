param(
  [ValidateSet("all", "backend", "frontend", "db")]
  [string]$Service = "all",
  [int]$Tail = 200,
  [switch]$Snapshot
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsDir = Join-Path $repoRoot "logs"
$logFile = Join-Path $logsDir "dev-stack.log"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$header = "==== $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") service=$Service tail=$Tail snapshot=$($Snapshot.IsPresent) ===="
$header | Tee-Object -FilePath $logFile -Append | Out-Null

$composeArgs = @(
  "-f",
  "docker-compose.dev.yml",
  "logs",
  "--no-color",
  "--timestamps",
  "--tail",
  $Tail.ToString()
)

if (-not $Snapshot) {
  $composeArgs += "--follow"
}

if ($Service -ne "all") {
  $composeArgs += $Service
}

Push-Location $repoRoot
try {
  & docker compose @composeArgs *>&1 | Tee-Object -FilePath $logFile -Append
}
finally {
  Pop-Location
}
