# Crée un raccourci « SNETAA-FO Orléans-Tours » (bureau + menu Démarrer) avec l'icône dédiée.
# L'application s'ouvre dans sa propre fenêtre (sans barre d'adresse), comme une vraie application.
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$index  = Join-Path $racine 'index.html'
$icone  = Join-Path $racine 'img\icone.ico'
if (-not (Test-Path $index)) { Write-Host "index.html introuvable dans $racine" -ForegroundColor Red; Read-Host 'Entrée pour fermer'; exit 1 }
$url = ([System.Uri]$index).AbsoluteUri

$candidats = @(
  @{ Nom = 'Google Chrome';  Chemins = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") },
  @{ Nom = 'Microsoft Edge'; Chemins = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") }
)
$trouves = @()
foreach ($c in $candidats) { $p = $c.Chemins | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1; if ($p) { $trouves += @{ Nom = $c.Nom; Exe = $p } } }
if ($trouves.Count -eq 0) { Write-Host 'Ni Chrome ni Edge n''ont été trouvés.' -ForegroundColor Red; Read-Host 'Entrée pour fermer'; exit 1 }

Write-Host ''
Write-Host 'IMPORTANT : choisis le navigateur avec lequel tu utilises déjà l''application,' -ForegroundColor Yellow
Write-Host 'car les données sont enregistrées dans ce navigateur.' -ForegroundColor Yellow
Write-Host ''
for ($i = 0; $i -lt $trouves.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $trouves[$i].Nom) }
$choix = 1
if ($trouves.Count -gt 1) { $r = Read-Host 'Ton choix (1 ou 2)'; if ($r -match '^[12]$') { $choix = [int]$r } }
$nav = $trouves[$choix - 1]

$shell = New-Object -ComObject WScript.Shell
$dossiers = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
foreach ($d in $dossiers) {
  $lnk = $shell.CreateShortcut((Join-Path $d 'SNETAA-FO Orléans-Tours.lnk'))
  $lnk.TargetPath = $nav.Exe
  $lnk.Arguments = "--app=`"$url`""
  $lnk.WorkingDirectory = $racine
  if (Test-Path $icone) { $lnk.IconLocation = "$icone,0" }
  $lnk.Description = 'Gestion syndicale SNETAA-FO Orléans-Tours'
  $lnk.Save()
}
Write-Host ''
Write-Host ("Raccourci créé sur le bureau et dans le menu Démarrer ({0})." -f $nav.Nom) -ForegroundColor Green
Write-Host 'Astuce : clic droit sur le raccourci > Épingler à la barre des tâches.'
Read-Host 'Entrée pour fermer'
