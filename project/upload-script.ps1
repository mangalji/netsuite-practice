
$ErrorActionPreference = "Stop"

$folder = Join-Path $PSScriptRoot "src\FileCabinet\SuiteScripts\Raj Mangal"

$files = @(Get-ChildItem -LiteralPath $folder -Filter "*.js" -File)

if ($files.Count -eq 0) {
    Write-Host "No JavaScript files found in: $folder"
    exit 1
}

Write-Host "`nSelect a script to upload:`n"

for ($i = 0; $i -lt $files.Count; $i++) {
    Write-Host "$($i + 1). $($files[$i].Name)"
}

$choice = Read-Host "`nEnter the number of the file"

if ($choice -notmatch '^\d+$') {
    Write-Host "Invalid selection."
    exit 1
}

$index = [int]$choice - 1

if ($index -lt 0 -or $index -ge $files.Count) {
    Write-Host "Invalid selection."
    exit 1
}

$file = $files[$index]
$remotePath = "/SuiteScripts/Raj Mangal/$($file.Name)"

Write-Host "`nUploading $($file.Name)...`n"

& suitecloud file:upload --paths $remotePath

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
