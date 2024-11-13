# deploy.ps1
param(
    [string]$RemoteHost="bj2k231128.kunwu.run",
    [string]$RemoteDir="/home/wukun/prod/handsdetection"
)

# Clean previous builds
Write-Host "Cleaning previous builds..."
Remove-Item -Path ".\build" -Recurse -Force -ErrorAction SilentlyContinue

# Build
Write-Host "Building web version..."
npm run build:web

# Prepare fresh build directory
$BuildDir = ".\build\web"
New-Item -ItemType Directory -Force -Path $BuildDir
New-Item -ItemType Directory -Force -Path "$BuildDir\assets"
# New-Item -ItemType Directory -Force -Path "$BuildDir\mediapipe"

# Define required files
$requiredFiles = @(
    @{Source="dist\bundle.js"; Destination="$BuildDir\bundle.js"},
    @{Source="src\styles.css"; Destination="$BuildDir\styles.css"},
    @{Source="src\assets\alarm.mp3"; Destination="$BuildDir\assets\alarm.mp3"},
    @{Source="web\GlassKR.svg"; Destination="$BuildDir\GlassKR.svg"},
    @{Source="node_modules\@mediapipe\hands"; Destination="$BuildDir\mediapipe\hands"},
    @{Source="node_modules\@mediapipe\camera_utils"; Destination="$BuildDir\mediapipe\camera_utils"},
    @{Source="node_modules\@mediapipe\control_utils"; Destination="$BuildDir\mediapipe\control_utils"},
    @{Source="node_modules\@mediapipe\drawing_utils"; Destination="$BuildDir\mediapipe\drawing_utils"}
)

# Copy files
Write-Host "Copying files..."
foreach ($file in $requiredFiles) {
    if (Test-Path $file.Source) {
        # Is folder or file
        if ((Get-Item $file.Source).PSIsContainer) {
            Copy-Item $file.Source -Destination $file.Destination -Recurse -Force
        } else {
            Copy-Item $file.Source $file.Destination -Force
        }
        Write-Host "Copied: $($file.Source)"
    } else {
        Write-Warning "Missing file: $($file.Source)"
    }
}

# Process index.html
Write-Host "Processing index.html..."
$indexContent = Get-Content "src\index.html" -Encoding UTF8
$indexContent = $indexContent -replace '<script src="scripts.js"></script>', '<script src="bundle.js"></script>'
# Use UTF8 encoding when writing the file
$UTF8WithoutBOM = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("$BuildDir\index.html", $indexContent, $UTF8WithoutBOM)

# Deploy
Write-Host "Deploying to $RemoteHost..."
scp -r "$BuildDir\*" "${RemoteHost}:${RemoteDir}"

Write-Host "Deployment complete!"